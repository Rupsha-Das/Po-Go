import multiprocessing.process
import os
import json
import asyncio
import websockets
import websocket
from dotenv import load_dotenv
import cv2
import numpy as np
import mediapipe as mp
import math
import threading
from datetime import datetime
import time
import multiprocessing

brk = False

def request_device_id():

    pass

def send_ws_updates(ws_server):
    while True:
        print("Sending updates to server...")
        time.sleep(5)
        if brk:
            break
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

    posture_thread = multiprocessing.Process(target=posture_detection)
    WS_thread = multiprocessing.Process(target=send_ws_updates, args=(WS_SERVER,))


    posture_thread.start()
    WS_thread.start()

    posture_thread.join()

    if WS_thread.is_alive():
        WS_thread.terminate()
        WS_thread.join()

    print("Exiting...")