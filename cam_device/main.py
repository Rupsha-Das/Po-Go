import multiprocessing.process
import os
import json
import asyncio
# import websockets
import websocket
from dotenv import load_dotenv
import cv2
import numpy as np
import mediapipe as mp
import math
from datetime import datetime
import time
import multiprocessing


def get_posture_status():
    pass

def update_env_once(key, value, env_file=".env"):
    if os.path.exists(env_file):
        with open(env_file, "r") as file:
            for line in file:
                if line.startswith(f"{key}="):
                    return  # Key already exists; do nothing.
    with open(env_file, "a") as file:
        file.write(f"\n{key}={value}\n")
    load_dotenv()  # Reload updated environment variables


def request_device_id(ws_server):
    try:
        ws = websocket.create_connection(ws_server)
        request_msg = json.dumps({"action": "request_device_id"})
        ws.send(request_msg)
        response = ws.recv()
        data = json.loads(response)
        if "device_id" in data:
            device_id = data["device_id"]
            print(f"Received Device ID: {device_id}")
            update_env_once("DEVICE_ID", device_id)
        ws.close()
    except Exception as e:
        print(f"Error requesting device ID: {e}")

def send_ws_updates(ws_server, device_id=None):
    if not device_id:  # Get device ID from environment
        device_id = os.getenv("DEVICE_ID")
    if not device_id:
        print("Device ID not found. Exiting...")
        return
    
    try:
        ws = websocket.create_connection(ws_server)
    except Exception as e:
        print(f"Error connecting to server (updates): {e}")
        return
    
    while True:
        try:
            request_msg = json.dumps({
                "deviceId": device_id,
                "action": "update",
                "timestamp": datetime.now().isoformat(),
                "neckAngle": {
                    "value": 0,
                    "confidence": 0
                },
                "armAngleR": {
                    "value": 0,
                    "confidence": 0
                },
                "armAngleL": {
                    "value": 0,
                    "confidence": 0
                },
                "backCurvature": {
                    "value": 0,
                    "confidence": 0
                }, 
                "hipAngle": {
                    "value": 0,
                    "confidence": 0
                }, 
                "kneeAngleR": {
                    "value": 0,
                    "confidence": 0
                },
                "kneeAngleL": {
                    "value": 0,
                    "confidence": 0
                }, 
                "posture": get_posture_status()
            })
            ws.send(request_msg)
            response = ws.recv()
            data = json.loads(response)
            print(f"Received: {data}")

        except Exception as e:
            print(f"Error requesting: {e}")
            pass

        print("Sending updates to server...")
        time.sleep(5)
    pass




def posture_detection():
    # Initialize MediaPipe Pose
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils  # For drawing landmarks
    # pose = mp_pose.Pose(model_complexity=2, min_detection_confidence=0.5, min_tracking_confidence=0.5)
    pose = mp_pose.Pose()

    # Start video capture
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Convert BGR to RGB (MediaPipe requires RGB)
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        
        # Process frame and get pose landmarks
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            # Draw landmarks on frame
            mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        # Display output
        cv2.imshow('Pose Detection', frame)

        # Exit with 'q'
        if cv2.waitKey(1) & 0xFF == ord('q'):
            # brk = True
            break
    # Release resources
    cap.release()
    cv2.destroyAllWindows()


async def main():
    load_dotenv()
    if not os.getenv("DEVICE_ID"):
        print("Requesting device ID from server...")
        request_device_id()
    else:
        print("Device ID found:", os.getenv("DEVICE_ID"))

    WS_SERVER = os.getenv("WS_SERVER")

    # Run both tasks concurrently
    await asyncio.gather(
        send_ws_updates(WS_SERVER),
        posture_detection()
    )

if __name__ == "__main__":
    load_dotenv()
    if not os.getenv("DEVICE_ID"):
        print("Requesting device ID from server...")
        request_device_id()
    else:
        print("Device ID found:", os.getenv("DEVICE_ID"))

    WS_SERVER = os.getenv("WS_SERVER")
    DEVICE_ID = os.getenv("DEVICE_ID")

    posture_thread = multiprocessing.Process(target=posture_detection)
    WS_thread = multiprocessing.Process(target=send_ws_updates, args=(WS_SERVER, DEVICE_ID, ))


    posture_thread.start()
    WS_thread.start()

    posture_thread.join()

    if WS_thread.is_alive():
        WS_thread.terminate()
        WS_thread.join()

    print("Exiting...")