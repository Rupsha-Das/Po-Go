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

def request_device_id():
    pass

async def send_ws_updates():
    pass

async def posture_detection():
    # Initialize MediaPipe Pose
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils  # For drawing landmarks
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
            break
    # Release resources
    cap.release()
    cv2.destroyAllWindows()


if __name__ == "__main__":
    load_dotenv()
    if not os.getenv("DEVICE_ID"):
        print("Requesting device ID from server...")
        request_device_id()
    else:
        print("Device ID found:", os.getenv("DEVICE_ID"))

    WS_SERVER = os.getenv("WS_SERVER")

    posture_thread = threading.Thread(target=posture_detection, daemon=True)
    posture_thread.start()

    asyncio.run(send_ws_updates(WS_SERVER))
    