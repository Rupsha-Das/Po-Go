import os
import json
import asyncio
import cv2
import numpy as np
import mediapipe as mp
import math
from datetime import datetime
import time
import threading
from dotenv import load_dotenv
import websockets
from queue import Queue
import requests

# ------------------ Global Data and Locks ------------------
posture_data = {
    "action": "update",
    "trust": 0,
    "timestamp": "",
    "neckAngle": {"value": 0, "confidence": 0},
    "backCurvature": {"value": 0, "confidence": 0},
    "armAngleL": {"value": 0, "confidence": 0},
    "armAngleR": {"value": 0, "confidence": 0},
    "hipAngle": {"value": 0, "confidence": 0},
    "kneeAngleL": {"value": 0, "confidence": 0},
    "kneeAngleR": {"value": 0, "confidence": 0},
    "posture": "GOOD",
}

posture_data_lock = threading.Lock()

classification = None
classification_lock = threading.Lock()

temperature = 0

message_queue = Queue()
ws_lock = threading.Lock()
device_id_lock = threading.Lock()

VIDEO_SOURCE = 0
# VIDEO_SOURCE="E:\Frosthacks\WhatsApp Image 2025-02-09 at 00.44.05_e472f090.jpg"
# VIDEO_SOURCE = "https://192.168.79.74:8080/video"

LOOP_DELAY = 0.3

brk = False  # Global flag to stop

ws = None
device_id = None


# ------------------ Utility ------------------
class FakeLandmark:
    def __init__(self, x, y, visibility):
        self.x = x
        self.y = y
        self.visibility = visibility


def get_posture_status(trust, smoothed_curvature):
    return posture_data["posture"]


# ------------------ WebSocket Communication ------------------
async def send_queued_messages(ws_connection):
    """Send messages from the queue asynchronously"""
    while not brk:
        try:
            if not message_queue.empty():
                message = message_queue.get()
                await ws_connection.send(message)
                print("Message sent to server")
            await asyncio.sleep(0.1)  # Prevent tight loop
        except Exception as e:
            print(f"Error sending message: {e}")
            break


def update_env(key, value, env_file=".env"):
    lines = []
    if os.path.exists(env_file):
        with open(env_file, "r") as file:
            lines = file.readlines()
    key_found = False
    for i, line in enumerate(lines):
        if line.startswith(f"{key}="):
            lines[i] = f"{key}={value}\n"
            key_found = True
            break
    if not key_found:
        lines.append(f"{key}={value}\n")
    with open(env_file, "w") as file:
        file.writelines(lines)
    load_dotenv(override=True)


async def receive_updates(ws_connection):
    global device_id
    while not brk:
        try:
            response = await ws_connection.recv()
            data = json.loads(response)
            print(f"Received: {data}")

            # Update device ID if present.
            if "device_id" in data:
                with device_id_lock:
                    device_id = data["device_id"]
                    print(f"Received Device ID: {device_id}")
                    update_env("DEVICE_ID", device_id)

            # Update threshold parameters if present.
            if "thresholds" in data and isinstance(data["thresholds"], dict):
                thresholds = data["thresholds"]
                for key, value in thresholds.items():
                    print(f"Updating threshold {key} to {value}")
                    update_env(
                        key, value
                    )  # Always update the threshold value in the .env file

        except websockets.exceptions.ConnectionClosed:
            print("Connection closed in receive_updates")
            break
        except Exception as e:
            print(f"Error receiving: {e}")
            break


async def main_ws_func(ws_server):
    """Main WebSocket connection handler with reconnection logic"""
    global ws, brk, device_id
    while not brk:
        try:
            async with websockets.connect(ws_server) as ws_connection:
                print("Connected to WebSocket server")
                with ws_lock:
                    ws = ws_connection

                # Request device ID if needed
                with device_id_lock:
                    if device_id is None:
                        request_msg = json.dumps({"action": "request_device_id"})
                        await ws_connection.send(request_msg)

                # Start concurrent tasks
                sender = asyncio.create_task(send_queued_messages(ws_connection))
                receiver = asyncio.create_task(receive_updates(ws_connection))
                await asyncio.gather(sender, receiver)

        except Exception as e:
            print(f"WebSocket error: {e}")
            await asyncio.sleep(5)
        finally:
            with ws_lock:
                ws = None


def run_main_ws_func(ws_server):
    # wrapper
    asyncio.run(main_ws_func(ws_server))


# ------------------ Posture Detection ------------------
smoothed_curvature = None
alpha = 0.1


# ISO11226 based classification for seated posture
def classify_posture_metrics_seated(metrics):
    TRUNK_ACCEPTABLE_THRESHOLD = float(os.getenv("TRUNK_ACCEPTABLE_THRESHOLD", "0.15"))
    TRUNK_WARNING_THRESHOLD = float(os.getenv("TRUNK_WARNING_THRESHOLD", "0.30"))

    NECK_DEVIATION_ACCEPTABLE = float(os.getenv("NECK_DEVIATION_ACCEPTABLE", "5"))
    NECK_DEVIATION_WARNING = float(os.getenv("NECK_DEVIATION_WARNING", "15"))

    ARM_ACCEPTABLE_MIN = float(os.getenv("ARM_ACCEPTABLE_MIN", "80"))
    ARM_ACCEPTABLE_MAX = float(os.getenv("ARM_ACCEPTABLE_MAX", "110"))
    ARM_WARNING_LOWER = float(os.getenv("ARM_WARNING_LOWER", "70"))
    ARM_WARNING_UPPER = float(os.getenv("ARM_WARNING_UPPER", "120"))

    HIP_ACCEPTABLE_MIN = float(os.getenv("HIP_ACCEPTABLE_MIN", "80"))
    HIP_ACCEPTABLE_MAX = float(os.getenv("HIP_ACCEPTABLE_MAX", "100"))
    HIP_WARNING_LOWER = float(os.getenv("HIP_WARNING_LOWER", "70"))
    HIP_WARNING_UPPER = float(os.getenv("HIP_WARNING_UPPER", "110"))

    KNEE_ACCEPTABLE_MIN = float(os.getenv("KNEE_ACCEPTABLE_MIN", "90"))
    KNEE_ACCEPTABLE_MAX = float(os.getenv("KNEE_ACCEPTABLE_MAX", "135"))
    KNEE_WARNING_LOWER = float(os.getenv("KNEE_WARNING_LOWER", "85"))
    KNEE_WARNING_UPPER = float(os.getenv("KNEE_WARNING_UPPER", "140"))

    classification = {}

    # --- Trunk Posture (Back Curvature) ---
    back_data = metrics.get("backCurvature", {})
    back_value = back_data.get("value", 0)
    back_conf = back_data.get("confidence", 0)
    if back_conf < 0.5:
        classification["trunk"] = "unknown"
    else:
        if back_value < TRUNK_ACCEPTABLE_THRESHOLD:
            classification["trunk"] = "acceptable"
        elif TRUNK_ACCEPTABLE_THRESHOLD <= back_value <= TRUNK_WARNING_THRESHOLD:
            classification["trunk"] = "warning"
        else:
            classification["trunk"] = "not recommended"

    # --- Neck Posture ---
    neck_data = metrics.get("neckAngle", {})
    neck_value = neck_data.get("value", 0)
    neck_conf = neck_data.get("confidence", 0)
    if neck_conf < 0.5:
        classification["neck"] = "unknown"
    else:
        deviation = abs(neck_value - 180)
        if deviation < NECK_DEVIATION_ACCEPTABLE:
            classification["neck"] = "acceptable"
        elif NECK_DEVIATION_ACCEPTABLE <= deviation < NECK_DEVIATION_WARNING:
            classification["neck"] = "warning"
        else:
            classification["neck"] = "not recommended"

    # --- Upper Extremity (Arm) Posture ---
    # Left Arm
    armL_data = metrics.get("armAngleL", {})
    armL_value = armL_data.get("value", 0)
    armL_conf = armL_data.get("confidence", 0)
    if armL_conf < 0.5:
        classification["arm_left"] = "unknown"
    else:
        if ARM_ACCEPTABLE_MIN <= armL_value <= ARM_ACCEPTABLE_MAX:
            classification["arm_left"] = "acceptable"
        elif (ARM_WARNING_LOWER <= armL_value < ARM_ACCEPTABLE_MIN) or (
            ARM_ACCEPTABLE_MAX < armL_value <= ARM_WARNING_UPPER
        ):
            classification["arm_left"] = "warning"
        else:
            classification["arm_left"] = "not recommended"

    # Right Arm
    armR_data = metrics.get("armAngleR", {})
    armR_value = armR_data.get("value", 0)
    armR_conf = armR_data.get("confidence", 0)
    if armR_conf < 0.5:
        classification["arm_right"] = "unknown"
    else:
        if ARM_ACCEPTABLE_MIN <= armR_value <= ARM_ACCEPTABLE_MAX:
            classification["arm_right"] = "acceptable"
        elif (ARM_WARNING_LOWER <= armR_value < ARM_ACCEPTABLE_MIN) or (
            ARM_ACCEPTABLE_MAX < armR_value <= ARM_WARNING_UPPER
        ):
            classification["arm_right"] = "warning"
        else:
            classification["arm_right"] = "not recommended"

    # --- Hip Posture ---
    hip_data = metrics.get("hipAngle", {})
    hip_value = hip_data.get("value", None)
    hip_conf = hip_data.get("confidence", 0)
    if hip_value is None or hip_conf < 0.5:
        classification["hip"] = "unknown"
    else:
        if HIP_ACCEPTABLE_MIN <= hip_value <= HIP_ACCEPTABLE_MAX:
            classification["hip"] = "acceptable"
        elif (HIP_WARNING_LOWER <= hip_value < HIP_ACCEPTABLE_MIN) or (
            HIP_ACCEPTABLE_MAX < hip_value <= HIP_WARNING_UPPER
        ):
            classification["hip"] = "warning"
        else:
            classification["hip"] = "not recommended"

    # --- Knee Posture ---
    kneeL_data = metrics.get("kneeAngleL", {})
    kneeL_value = kneeL_data.get("value", 0)
    kneeL_conf = kneeL_data.get("confidence", 0)
    kneeR_data = metrics.get("kneeAngleR", {})
    kneeR_value = kneeR_data.get("value", 0)
    kneeR_conf = kneeR_data.get("confidence", 0)
    if kneeL_conf < 0.5 or kneeR_conf < 0.5:
        classification["knee"] = "unknown"
    else:
        avg_knee = (kneeL_value + kneeR_value) / 2
        if KNEE_ACCEPTABLE_MIN <= avg_knee <= KNEE_ACCEPTABLE_MAX:
            classification["knee"] = "acceptable"
        elif (KNEE_WARNING_LOWER <= avg_knee < KNEE_ACCEPTABLE_MIN) or (
            KNEE_ACCEPTABLE_MAX < avg_knee <= KNEE_WARNING_UPPER
        ):
            classification["knee"] = "warning"
        else:
            classification["knee"] = "not recommended"

    # --- Overall Posture Classification ---
    segments = []
    for seg in ["trunk", "neck", "arm_left", "arm_right", "hip", "knee"]:
        status = classification.get(seg)
        if status != "unknown":
            segments.append(status)

    if not segments:
        overall = "unknown"
    elif any(s == "warning" for s in segments):
        overall = "WARNING"
    elif sum(1 for s in segments if s == "acceptable") > (len(segments) / 2):
        overall = "GOOD"
    else:
        overall = "MEH"

    classification["overall"] = overall

    return classification


def posture_detection(stream=True, debug_view=True):
    global smoothed_curvature, brk
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    pose = mp_pose.Pose(static_image_mode=False, enable_segmentation=True)

    # Helper functions defined once.

    def compute_new_thresholds(current_data):
        new_thresholds = {}

        # Back Curvature (Trunk)
        if current_data['backCurvature']['confidence'] >= 0.5:
            current_curvature = current_data['backCurvature']['value']
            new_thresholds['TRUNK_ACCEPTABLE_THRESHOLD'] = max(current_curvature + 0.05, 0.0)
            new_thresholds['TRUNK_WARNING_THRESHOLD'] = max(current_curvature + 0.15, 0.0)

        # Neck Deviation
        if current_data['neckAngle']['confidence'] >= 0.5:
            current_neck = current_data['neckAngle']['value']
            deviation = abs(current_neck - 180)
            new_thresholds['NECK_DEVIATION_ACCEPTABLE'] = deviation + 5
            new_thresholds['NECK_DEVIATION_WARNING'] = deviation + 15

        # Arm Angles (Average of Left and Right)
        if (current_data['armAngleL']['confidence'] >= 0.5 and 
            current_data['armAngleR']['confidence'] >= 0.5):
            avg_arm = (current_data['armAngleL']['value'] + current_data['armAngleR']['value']) / 2
            new_thresholds['ARM_ACCEPTABLE_MIN'] = max(avg_arm - 10, 0.0)
            new_thresholds['ARM_ACCEPTABLE_MAX'] = avg_arm + 10
            new_thresholds['ARM_WARNING_LOWER'] = max(avg_arm - 20, 0.0)
            new_thresholds['ARM_WARNING_UPPER'] = avg_arm + 20

        # Hip Angle
        if current_data['hipAngle']['confidence'] and current_data['hipAngle']['confidence'] >= 0.5:
            hip = current_data['hipAngle']['value']
            new_thresholds['HIP_ACCEPTABLE_MIN'] = max(hip - 5, 0.0)
            new_thresholds['HIP_ACCEPTABLE_MAX'] = hip + 5
            new_thresholds['HIP_WARNING_LOWER'] = max(hip - 10, 0.0)
            new_thresholds['HIP_WARNING_UPPER'] = hip + 10

        # Knee Angles (Average)
        if (current_data['kneeAngleL']['confidence'] >= 0.5 and 
            current_data['kneeAngleR']['confidence'] >= 0.5):
            avg_knee = (current_data['kneeAngleL']['value'] + current_data['kneeAngleR']['value']) / 2
            new_thresholds['KNEE_ACCEPTABLE_MIN'] = max(avg_knee - 15, 0.0)
            new_thresholds['KNEE_ACCEPTABLE_MAX'] = avg_knee + 15
            new_thresholds['KNEE_WARNING_LOWER'] = max(avg_knee - 25, 0.0)
            new_thresholds['KNEE_WARNING_UPPER'] = avg_knee + 25

        return new_thresholds


    def duration_Analysis():
        global temperature
        t_inc_rate = float(os.getenv("T_INC_RATE", "0.1")) * LOOP_DELAY
        t_dec_rate = float(os.getenv("T_DEC_RATE", "0.05")) * LOOP_DELAY
        threshold = float(os.getenv("THRESHOLD", "1.0")) * LOOP_DELAY

        with posture_data_lock:
            if posture_data["posture"]["overall"] == "BAD":
                temperature += t_inc_rate
            else:
                temperature -= t_dec_rate

            temperature = max(0, temperature)  # Ensure temperature doesn't go below 0

            if temperature > threshold:
                alert()

    def alert():
        print("ALERT: Bad posture detected for an extended period!")
        # Play a pinging sound
        duration = 0.5  # seconds
        freq = 440  # Hz
        os.system("play -nq -t alsa synth {} sine {}".format(duration, freq))
        # Send a POST request to the API
        api_url = os.getenv("API_URL")

        if api_url: # optional
            try:
                headers = {"Content-Type": "application/json"}
                payload = {
                    "deviceId": device_id,
                    "timestamp": datetime.now().isoformat(),
                    "posture": posture_data["posture"],
                    "temperature": temperature,
                }
                response = requests.post(api_url, headers=headers, json=payload)
                if response.status_code == 200:
                    print("Successfully sent alert to API")
                else:
                    print(
                        f"Failed to send alert to API: {response.status_code} {response.text}"
                    )
            except Exception as e:
                print(f"Error sending alert to API: {e}")

    def get_midpoint(point1, point2):
        return ((point1[0] + point2[0]) // 2, (point1[1] + point2[1]) // 2)

    def draw_bold_line(frame, point1, point2, color, thickness):
        if debug_view:
            cv2.line(frame, point1, point2, color, thickness)

    def draw_text_with_outline(frame, text, position, scale, color, thickness=2):
        if debug_view:
            cv2.putText(
                frame,
                text,
                position,
                cv2.FONT_HERSHEY_SIMPLEX,
                scale,
                (0, 0, 0),
                thickness + 2,
            )
            cv2.putText(
                frame, text, position, cv2.FONT_HERSHEY_SIMPLEX, scale, color, thickness
            )

    def calculate_angle(p1, p2, p3):
        # Compute the angle at p2 between vectors p2->p1 and p2->p3.
        v1 = np.array([p1[0] - p2[0], p1[1] - p2[1]], dtype=np.float32)
        v2 = np.array([p3[0] - p2[0], p3[1] - p2[1]], dtype=np.float32)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 < 1e-6 or norm2 < 1e-6:
            return 0
        dot = np.dot(v1, v2)
        angle_rad = np.arccos(np.clip(dot / (norm1 * norm2), -1.0, 1.0))
        return np.degrees(angle_rad)

    def safe_draw_and_compute_angle(frame, l1, l2, l3, color, get_coords):
        if l1.visibility > 0.5 and l2.visibility > 0.5 and l3.visibility > 0.5:
            p1 = get_coords(l1)
            p2 = get_coords(l2)
            p3 = get_coords(l3)
            angle = calculate_angle(p1, p2, p3)
            conf = min(l1.visibility, l2.visibility, l3.visibility)
            if debug_view:
                draw_bold_line(frame, p1, p2, color, 4)
                draw_bold_line(frame, p2, p3, color, 4)
                draw_text_with_outline(frame, f"{int(angle)}°", p2, 0.8, color)
            print(
                f"[DEBUG] Angle between points {p1}, {p2}, {p3}: {int(angle)}° (conf: {conf:.2f})"
            )
            return angle, conf
        return None, 0

    def ray_segment_intersection(ray_origin, ray_direction, pt1, pt2):
        segment_vec = pt2 - pt1
        cross_val = np.cross(ray_direction, segment_vec)
        if abs(cross_val) < 1e-6:
            return None
        diff = pt1 - ray_origin
        t = np.cross(diff, segment_vec) / cross_val
        s = np.cross(diff, ray_direction) / cross_val
        if t >= 0 and 0 <= s <= 1:
            return ray_origin + t * ray_direction, t
        return None

    def calculate_curvature_and_trust(frame, results):
        if not results.pose_landmarks:
            return 0, 0, frame

        landmarks = results.pose_landmarks.landmark
        h, w = frame.shape[:2]
        # Convert landmarks to pixel coordinates once.
        coord = lambda lm: np.array([lm.x * w, lm.y * h], dtype=np.float32)

        left_shoulder = coord(landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER])
        right_shoulder = coord(landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER])
        left_hip = coord(landmarks[mp_pose.PoseLandmark.LEFT_HIP])
        right_hip = coord(landmarks[mp_pose.PoseLandmark.RIGHT_HIP])
        nose = coord(landmarks[mp_pose.PoseLandmark.NOSE])

        # Compute midpoints and the central line.
        shoulder_mid = (left_shoulder + right_shoulder) / 2
        hip_mid = (left_hip + right_hip) / 2
        line_a_mid = (shoulder_mid + hip_mid) / 2

        # Compute a unit perpendicular vector to the line.
        dir_vector = hip_mid - shoulder_mid
        perpendicular_vector = np.array(
            [-dir_vector[1], dir_vector[0]], dtype=np.float32
        )
        norm_perp = np.linalg.norm(perpendicular_vector)
        perpendicular_vector /= norm_perp + 1e-6
        if np.dot(perpendicular_vector, nose - line_a_mid) > 0:
            perpendicular_vector *= -1

        # Compute trust from the torso aspect ratio.
        torso_width = np.linalg.norm(left_shoulder - right_shoulder)
        torso_height = np.linalg.norm(shoulder_mid - hip_mid)
        aspect_ratio = torso_height / (torso_width + 1e-6)
        trust = np.clip(aspect_ratio / 2.5, 0, 1)

        # Use segmentation mask to compute the back contour intersection.
        mask = (results.segmentation_mask > 0.5).astype("uint8") * 255
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        point_a, best_t = None, np.inf
        if contours:
            contour = contours[0][:, 0, :].astype(np.float32)
            num_points = len(contour)
            for i in range(num_points):
                pt1 = contour[i]
                pt2 = contour[
                    (i + 1) % num_points
                ]  # Wrap-around for cyclic processing.
                res = ray_segment_intersection(
                    line_a_mid, perpendicular_vector, pt1, pt2
                )
                if res is not None:
                    intersection_point, t_val = res
                    if t_val < best_t:
                        best_t = t_val
                        point_a = intersection_point

        if point_a is not None:
            distance = np.linalg.norm(point_a - line_a_mid)
            spine_length = np.linalg.norm(shoulder_mid - hip_mid)
            neck_length = np.linalg.norm(nose - shoulder_mid)
            body_size = spine_length + neck_length
            curvature = distance / (body_size + 1e-6)
        else:
            curvature = 0

        # If debugging, do all the drawing using cached integer conversions.
        if debug_view:
            debug_frame = frame.copy()
            if contours:
                cv2.drawContours(debug_frame, contours, -1, (0, 255, 0), 2)
            if point_a is not None:
                shoulder_mid_int = tuple(shoulder_mid.astype(int))
                hip_mid_int = tuple(hip_mid.astype(int))
                line_a_mid_int = tuple(line_a_mid.astype(int))
                point_a_int = tuple(point_a.astype(int))
                cv2.line(debug_frame, shoulder_mid_int, hip_mid_int, (0, 255, 0), 2)
                perp_end = line_a_mid + perpendicular_vector * 100
                cv2.line(
                    debug_frame,
                    line_a_mid_int,
                    tuple(perp_end.astype(int)),
                    (255, 0, 0),
                    2,
                )
                cv2.line(debug_frame, line_a_mid_int, point_a_int, (0, 165, 255), 2)
                cv2.circle(debug_frame, point_a_int, 5, (0, 0, 255), -1)
            cv2.putText(
                debug_frame,
                f"Curvature: {curvature:.2f}",
                (10, 60),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (255, 255, 0),
                2,
            )
            cv2.putText(
                debug_frame,
                f"Trust: {trust:.2f}",
                (10, 30),
                cv2.FONT_HERSHEY_SIMPLEX,
                0.7,
                (0, 255, 0) if trust > 0.7 else (0, 0, 255),
                2,
            )
        else:
            debug_frame = frame

        print(f"[DEBUG] Curvature: {curvature:.2f}, Trust: {trust:.2f}")
        return curvature, trust, debug_frame

    def process_posture_angles(frame, results):
        h, w = frame.shape[:2]
        get_coords = lambda l: (int(l.x * w), int(l.y * h))
        angles = {
            "neckAngle": {"value": None, "confidence": None},
            "backAngle": {"value": None, "confidence": None},
            "hipAngle": {"value": None, "confidence": None},
            "armAngle": {
                1: {"value": None, "confidence": None},
                2: {"value": None, "confidence": None},
            },
            "kneeAngle": {
                1: {"value": None, "confidence": None},
                2: {"value": None, "confidence": None},
            },
        }
        if not results.pose_landmarks:
            return angles

        if debug_view:
            mp_drawing.draw_landmarks(
                frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS
            )
        landmarks = results.pose_landmarks.landmark

        # Precompute all landmark pixel coordinates to avoid repeated multiplications.
        coords = {i: get_coords(lm) for i, lm in enumerate(landmarks)}

        nose = landmarks[mp_pose.PoseLandmark.NOSE]
        left_shoulder = landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER]
        right_shoulder = landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER]
        left_hip = landmarks[mp_pose.PoseLandmark.LEFT_HIP]
        right_hip = landmarks[mp_pose.PoseLandmark.RIGHT_HIP]

        if (
            nose.visibility > 0.5
            and left_shoulder.visibility > 0.5
            and right_shoulder.visibility > 0.5
            and left_hip.visibility > 0.5
            and right_hip.visibility > 0.5
        ):
            shoulder_left_coord = get_coords(left_shoulder)
            shoulder_right_coord = get_coords(right_shoulder)
            hip_left_coord = get_coords(left_hip)
            hip_right_coord = get_coords(right_hip)
            shoulder_mid_coord = get_midpoint(shoulder_left_coord, shoulder_right_coord)
            hip_mid_coord = get_midpoint(hip_left_coord, hip_right_coord)
            fake_shoulder = FakeLandmark(
                shoulder_mid_coord[0] / w,
                shoulder_mid_coord[1] / h,  # Correct normalization for y.
                min(left_shoulder.visibility, right_shoulder.visibility),
            )
            fake_hip = FakeLandmark(
                hip_mid_coord[0] / w,
                hip_mid_coord[1] / h,       # Correct normalization for y.
                min(left_hip.visibility, right_hip.visibility),
            )

            angle, conf = safe_draw_and_compute_angle(
                frame, nose, fake_shoulder, fake_hip, (0, 255, 0), get_coords
            )
            angles["neckAngle"]["value"] = angle
            angles["neckAngle"]["confidence"] = conf

            left_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE]
            right_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE]
            knee_candidates = []
            if left_knee.visibility > 0.5:
                knee_candidates.append(("left", get_coords(left_knee), left_knee))
            if right_knee.visibility > 0.5:
                knee_candidates.append(("right", get_coords(right_knee), right_knee))
            if knee_candidates:
                chosen_knee = min(
                    knee_candidates,
                    key=lambda candidate: math.hypot(
                        candidate[1][0] - hip_mid_coord[0],
                        candidate[1][1] - hip_mid_coord[1],
                    ),
                )[2]
                hip_angle, hip_conf = safe_draw_and_compute_angle(
                    frame,
                    fake_shoulder,
                    fake_hip,
                    chosen_knee,
                    (0, 255, 255),
                    get_coords,
                )
                angles["hipAngle"]["value"] = hip_angle
                angles["hipAngle"]["confidence"] = hip_conf

        # Compute Back Angle (using left-side landmarks).
        left_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE]
        angle, conf = safe_draw_and_compute_angle(
            frame, left_knee, left_hip, left_shoulder, (255, 255, 0), get_coords
        )
        angles["backAngle"]["value"] = angle
        angles["backAngle"]["confidence"] = conf

        # Compute Left and Right Arm Angles.
        left_elbow = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW]
        left_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST]
        angle, conf = safe_draw_and_compute_angle(
            frame, left_shoulder, left_elbow, left_wrist, (0, 0, 255), get_coords
        )
        angles["armAngle"][1]["value"] = angle
        angles["armAngle"][1]["confidence"] = conf

        right_elbow = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW]
        right_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST]
        angle, conf = safe_draw_and_compute_angle(
            frame, right_shoulder, right_elbow, right_wrist, (255, 0, 255), get_coords
        )
        angles["armAngle"][2]["value"] = angle
        angles["armAngle"][2]["confidence"] = conf

        # Compute Knee Angles.
        left_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE]
        angle, conf = safe_draw_and_compute_angle(
            frame, left_hip, left_knee, left_ankle, (255, 165, 0), get_coords
        )
        angles["kneeAngle"][1]["value"] = angle
        angles["kneeAngle"][1]["confidence"] = conf

        right_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE]
        right_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE]
        angle, conf = safe_draw_and_compute_angle(
            frame, right_hip, right_knee, right_ankle, (255, 165, 0), get_coords
        )
        angles["kneeAngle"][2]["value"] = angle
        angles["kneeAngle"][2]["confidence"] = conf

        print(f"[DEBUG] Angle Data: {angles}")
        return angles

    def update_posture_data():
        global smoothed_curvature, brk
        cap = cv2.VideoCapture(VIDEO_SOURCE)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)  # Set buffer size to 1
        display_scale = 1

        while cap.isOpened() and not brk:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.resize(frame, (640, 480))
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)

            # #REMOVE
            # if results.pose_landmarks:
            #     mp_drawing.draw_landmarks(
            #         frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS
            #     )

            # #REMOVE
            # cv2.imshow("frame", frame)
            # cv2.waitKey(0)

            curvature, trust, debug_frame = calculate_curvature_and_trust(
                frame, results
            )
            # #REMOVE
            # cv2.imshow("frame", debug_frame)
            # cv2.waitKey(0)

            angle_data = process_posture_angles(debug_frame, results)

            # #REMOVE
            # cv2.imshow("frame", debug_frame)
            # cv2.waitKey(0)

            # Exponential smoothing of curvature.
            if smoothed_curvature is None:
                smoothed_curvature = curvature
            elif curvature > 0:
                smoothed_curvature = (
                    alpha * curvature + (1 - alpha) * smoothed_curvature
                )

            if debug_view:
                cv2.putText(
                    debug_frame,
                    f"Smoothed Curvature: {smoothed_curvature:.2f}",
                    (10, 90),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    0.7,
                    (200, 200, 0),
                    2,
                )
                if trust > 0.7 and smoothed_curvature > 0.45:
                    cv2.putText(
                        debug_frame,
                        "BAD POSTURE!",
                        (50, 80),
                        cv2.FONT_HERSHEY_SIMPLEX,
                        1,
                        (0, 0, 255),
                        2,
                    )

            print(f"[DEBUG] Smoothed Curvature: {smoothed_curvature:.2f}")
            if trust > 0.7 and smoothed_curvature > 0.45:
                print("[DEBUG] BAD POSTURE!")

            with posture_data_lock:
                posture_data.update(
                    {
                        "trust": trust,
                        "timestamp": datetime.now().isoformat(),
                        "neckAngle": {
                            "value": angle_data["neckAngle"]["value"] or 0,
                            "confidence": angle_data["neckAngle"]["confidence"] or 0,
                        },
                        "backCurvature": {
                            "value": smoothed_curvature,
                            "confidence": trust,
                        },
                        "armAngleL": {
                            "value": (
                                angle_data["armAngle"][1]["value"]
                                if angle_data["armAngle"][1]["value"] is not None
                                else 0
                            ),
                            "confidence": (
                                angle_data["armAngle"][1]["confidence"]
                                if angle_data["armAngle"][1]["confidence"] is not None
                                else 0
                            ),
                        },
                        "armAngleR": {
                            "value": (
                                angle_data["armAngle"][2]["value"]
                                if angle_data["armAngle"][2]["value"] is not None
                                else 0
                            ),
                            "confidence": (
                                angle_data["armAngle"][2]["confidence"]
                                if angle_data["armAngle"][2]["confidence"] is not None
                                else 0
                            ),
                        },
                        "hipAngle": {
                            "value": angle_data["hipAngle"]["value"],
                            "confidence": angle_data["hipAngle"]["confidence"],
                        },
                        "kneeAngleL": {
                            "value": (
                                angle_data["kneeAngle"][1]["value"]
                                if angle_data["kneeAngle"][1]["value"] is not None
                                else 0
                            ),
                            "confidence": (
                                angle_data["kneeAngle"][1]["confidence"]
                                if angle_data["kneeAngle"][1]["confidence"] is not None
                                else 0
                            ),
                        },
                        "kneeAngleR": {
                            "value": (
                                angle_data["kneeAngle"][2]["value"]
                                if angle_data["kneeAngle"][2]["value"] is not None
                                else 0
                            ),
                            "confidence": (
                                angle_data["kneeAngle"][2]["confidence"]
                                if angle_data["kneeAngle"][2]["confidence"] is not None
                                else 0
                            ),
                        },
                        "posture": get_posture_status(trust, smoothed_curvature),
                    }
                )

            with device_id_lock, posture_data_lock:
                message = json.dumps(
                    {"deviceId": device_id, "action": "update", **posture_data},
                    default=lambda x: (
                        float(x) if isinstance(x, (np.float32, np.float64)) else x
                    ),
                )
                message_queue.put(message)

            with posture_data_lock, classification_lock:
                classification = classify_posture_metrics_seated(posture_data)
                posture_data["posture"] = classification
                print("[DEBUG] Seated Posture Classification:", classification)

            print("[DEBUG] Posture Data:")
            print(f"  Timestamp: {posture_data['timestamp']}")
            print(f"  Trust: {posture_data['trust']:.2f}")
            print(f"  Neck Angle: {posture_data['neckAngle']}")
            print(f"  Back Curvature: {posture_data['backCurvature']}")
            print(f"  Arm Angle L: {posture_data['armAngleL']}")
            print(f"  Arm Angle R: {posture_data['armAngleR']}")
            print(f"  Hip Angle: {posture_data['hipAngle']}")
            print(f"  Knee Angle L: {posture_data['kneeAngleL']}")
            print(f"  Knee Angle R: {posture_data['kneeAngleR']}")
            print(f"  Posture: {posture_data['posture']}")
            print("------------------------------------------------------")

            if debug_view:
                frame_display = cv2.resize(
                    debug_frame, None, fx=display_scale, fy=display_scale
                )
                cv2.putText(
                    frame_display,
                    f"Posture: {posture_data['posture']['overall']}",
                    (10, 120),
                    cv2.FONT_HERSHEY_SIMPLEX,
                    1,
                    (0, 0, 255),
                    2,
                )
                # Check for 'c' key press to calibrate
                key = cv2.waitKey(10) & 0xFF
                if key == ord('c'):
                    # Capture current posture data
                    with posture_data_lock:
                        current_data = posture_data.copy()
                    # Compute new thresholds
                    new_thresholds = compute_new_thresholds(current_data)
                    # Update environment variables
                    for key, value in new_thresholds.items():
                        update_env(key, str(value))
                    print("Calibration completed. New thresholds:", new_thresholds)
                    # Display calibration message
                    cv2.putText(frame_display, "Calibration Complete!", (50, 160), 
                               cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 255, 0), 2)
                cv2.imshow("Pose Detection", frame_display)
                if key == ord('q'):
                    brk = True
                    break
                
            duration_Analysis()
            time.sleep(LOOP_DELAY)

        cap.release()
        if debug_view:
            cv2.destroyAllWindows()

    update_posture_data()


# ------------------ Main Entry Point ------------------
if __name__ == "__main__":
    load_dotenv()
    WS_SERVER = os.getenv("WS_SERVER")
    DEVICE_ID = os.getenv("DEVICE_ID")

    with device_id_lock:
        device_id = DEVICE_ID

    # Start threads
    posture_thread = threading.Thread(target=posture_detection)
    ws_thread = threading.Thread(target=run_main_ws_func, args=(WS_SERVER,))

    posture_thread.start()
    ws_thread.start()

    # Wait for posture detection to finish
    posture_thread.join()
    brk = True  # Signal WebSocket thread to exit
    ws_thread.join()

    print("Exiting...")
