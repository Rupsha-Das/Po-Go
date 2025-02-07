import os
import json
import asyncio
import cv2
import numpy as np
import mediapipe as mp
import math
from datetime import datetime
import time
import multiprocessing
from dotenv import load_dotenv
import websocket  # Make sure websocket-client is installed

brk = False

def get_posture_status():
    # Replace with your actual posture status logic.
    return "unknown"


def update_env_once(key, value, env_file=".env"):
    if os.path.exists(env_file):
        with open(env_file, "r") as file:
            for line in file:
                if line.startswith(f"{key}="):
                    return  # Key already exists; do nothing.
    with open(env_file, "a") as file:
        file.write(f"\n{key}={value}\n")
    load_dotenv()  # Reload updated environment variables

async def connect_to_server(ws_server):
    try:
        ws = websocket.create_connection(ws_server)
        print("Connected to server.")
        return ws
    except Exception as e:
        print(f"Error connecting to server: {e}")
        return None
    
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

async def receive_updates(ws):
    while True:
        try:
            response = ws.recv()
            data = json.loads(response)
            print(f"Received: {data}")
            # Process received data as needed.
        except Exception as e:
            print(f"Error receiving data: {e}")
            if brk:
                break

async def send_ws_updates(ws_server, device_id=None):
    if not device_id:
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
                "neckAngle": {"value": 0, "confidence": 0},
                "armAngleR": {"value": 0, "confidence": 0},
                "armAngleL": {"value": 0, "confidence": 0},
                "backCurvature": {"value": 0, "confidence": 0}, 
                "hipAngle": {"value": 0, "confidence": 0}, 
                "kneeAngleR": {"value": 0, "confidence": 0},
                "kneeAngleL": {"value": 0, "confidence": 0}, 
                "posture": get_posture_status()
            })
            ws.send(request_msg)
            print("Sending updates to server...")
        except Exception as e:
            print(f"Error sending update: {e}")
            pass
        await asyncio.sleep(30)  # non-blocking sleep

async def main_ws_func(ws_server, device_id=None):
    ws = await connect_to_server(ws_server)
    if not ws:
        return

    # Start both receiving and sending tasks asynchronously
    receive_task = asyncio.create_task(receive_updates(ws))
    send_task = asyncio.create_task(send_ws_updates(ws_server, device_id))

    # Wait for both tasks to run concurrently
    await asyncio.gather(receive_task, send_task)

def posture_detection():
    # Initialize MediaPipe Pose
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    pose = mp_pose.Pose()

    # Start video capture
    cap = cv2.VideoCapture(0)

    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break

        # Convert BGR to RGB as MediaPipe requires RGB
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(rgb_frame)

        if results.pose_landmarks:
            mp_drawing.draw_landmarks(frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

        cv2.imshow('Pose Detection', frame)

        if cv2.waitKey(1) & 0xFF == ord('q'):
            break

    cap.release()
    cv2.destroyAllWindows()

# Synchronous wrapper for the async function
def run_main_ws_func(ws_server, device_id):
    asyncio.run(main_ws_func(ws_server, device_id))

if __name__ == "__main__":
    load_dotenv()
    WS_SERVER = os.getenv("WS_SERVER")
    
    if not os.getenv("DEVICE_ID"):
        print("Requesting device ID from server...")
        request_device_id(WS_SERVER)
    else:
        print("Device ID found:", os.getenv("DEVICE_ID"))

    DEVICE_ID = os.getenv("DEVICE_ID")

    # Create separate processes for posture detection and WebSocket communication
    posture_thread = multiprocessing.Process(target=posture_detection)
    WS_thread = multiprocessing.Process(target=run_main_ws_func, args=(WS_SERVER, DEVICE_ID,))

    posture_thread.start()
    WS_thread.start()

    posture_thread.join()

    if WS_thread.is_alive():
        WS_thread.terminate()
        WS_thread.join()

    print("Exiting...")
