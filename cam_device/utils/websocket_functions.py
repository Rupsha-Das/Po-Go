import multiprocessing.process
import os
import json
import asyncio
import websocket
from dotenv import load_dotenv
import cv2
import numpy as np
import mediapipe as mp
import math
from datetime import datetime
import time
import multiprocessing

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
        time.sleep(30)
