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

def update_env_once(key, value, env_file=".env"):
    if os.path.exists(env_file):
        with open(env_file, "r") as file:
            for line in file:
                if line.startswith(f"{key}="):
                    return  # Key already exists; do nothing.
    with open(env_file, "a") as file:
        file.write(f"\n{key}={value}\n")
    load_dotenv()  # Reload updated environment variables
