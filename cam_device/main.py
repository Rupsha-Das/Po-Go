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

# ------------------ Global Data and Locks ------------------
posture_data = {
    "timestamp": "",
    "curvature": None,
    "trust": None,
    "neckAngle": {"value": None, "confidence": None},
    "backAngle": {"value": None, "confidence": None},
    "armAngle": {
        1: {"value": None, "confidence": None},
        2: {"value": None, "confidence": None},
    },
    "kneeAngle": {
        1: {"value": None, "confidence": None},
        2: {"value": None, "confidence": None},
    },
    "postureStatus": None,
}
posture_data_lock = threading.Lock()

VIDEO_SOURCE = 0
brk = False  # Global flag to stop


# ------------------ Utility ------------------
class FakeLandmark:
    def __init__(self, x, y, visibility):
        self.x = x
        self.y = y
        self.visibility = visibility


def get_posture_status():
    return "unknown"


def update_env_once(key, value, env_file=".env"):
    if os.path.exists(env_file):
        with open(env_file, "r") as file:
            for line in file:
                if line.startswith(f"{key}="):
                    return
    with open(env_file, "a") as file:
        file.write(f"\n{key}={value}\n")
    load_dotenv()


# ------------------ WebSocket Communication ------------------


async def request_device_id(ws):
    print("request_device_id!!!!!!!!!!")
    try:
        request_msg = json.dumps({"action": "request_device_id"})
        await ws.send(request_msg)
        print("Sent update to server.")

    except Exception as e:
        print(f"-|Error requesting device ID: {e} \n |closing (request_device_id)")


async def receive_updates(ws):
    print("receive_updates!!!!!!!!!!")
    while True:
        try:
            response = await ws.recv()  # Await the response from the WebSocket
            data = json.loads(response)
            print(f"Received: {data}")

            if "device_id" in data:  # Device id alloted
                device_id = data["device_id"]
                print(f"Received Device ID: {device_id}")
                update_env_once("DEVICE_ID", device_id)

            # Process received data as needed.
        except websockets.exceptions.ConnectionClosed:
            print("Connection closed, stopping receive_updates.")
            break
        except Exception as e:
            print(f"-|Error receiving data: {e}")
            break  # Break on any unexpected errors


async def send_ws_updates(ws, device_id):
    while not brk:  # Continue sending until brk
        try:
            message = json.dumps(
                {
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
                    "posture": get_posture_status(),
                }
            )
            await ws.send(message)
            print("Sent update to server.")
            await asyncio.sleep(1)
        except websockets.exceptions.ConnectionClosed:
            print("WebSocket connection closed during send.")
            break
        except Exception as e:
            print(f"Error sending update: {e}")
            break


# ------------------ WebSocket Communication ------------------
async def main_ws_func(ws_server, device_id):
    print("main_ws_func!!!!!!!!!!")

    ws = None

    while not brk:  # Reconnection loop
        try:
            ws = await websockets.connect(ws_server)
            # ws = await connect_to_server(ws_server)
            if not ws:
                await asyncio.sleep(5)  # Wait before retrying connection
                continue

            print("Connected to server.")
            # Create tasks for sending and receiving

            send_task = asyncio.create_task(send_ws_updates(ws, device_id))
            receive_task = asyncio.create_task(receive_updates(ws))

            done, pending = await asyncio.wait(
                [receive_task, send_task], return_when=asyncio.ALL_COMPLETED
            )

            # Cancel pending tasks
            for task in pending:
                task.cancel()
            # Wait for cancelled tasks to finish
            await asyncio.gather(*pending, return_exceptions=True)

        except Exception as e:
            print(f"Error in WebSocket loop: {e}")
        finally:
            if ws:
                await ws.close()
            # Wait before reconnecting if not brk
            if not brk:
                await asyncio.sleep(5)


def run_main_ws_func(ws_server, device_id):
    print("run_main_ws_func!!!!!!!!!!")
    asyncio.run(main_ws_func(ws_server, device_id))


# ------------------ Posture Detection ------------------
smoothed_curvature = None
alpha = 0.1


def posture_detection(stream=True):
    global smoothed_curvature, brk
    # Initialize MediaPipe Pose
    mp_pose = mp.solutions.pose
    mp_drawing = mp.solutions.drawing_utils
    pose = mp_pose.Pose(static_image_mode=False, enable_segmentation=True)

    def get_midpoint(point1, point2):
        return (int((point1[0] + point2[0]) / 2), int((point1[1] + point2[1]) / 2))

    def draw_bold_line(frame, point1, point2, color, thickness):
        cv2.line(frame, point1, point2, color, thickness)

    def draw_text_with_outline(frame, text, position, scale, color, thickness=2):
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
        v1 = np.array([p1[0] - p2[0], p1[1] - p2[1]], dtype=np.float32)
        v2 = np.array([p3[0] - p2[0], p3[1] - p2[1]], dtype=np.float32)
        norm1 = np.linalg.norm(v1)
        norm2 = np.linalg.norm(v2)
        if norm1 == 0 or norm2 == 0:
            return 0
        dot = np.dot(v1, v2)
        angle_rad = np.arccos(dot / (norm1 * norm2))
        angle_deg = np.degrees(angle_rad)
        return angle_deg

    def safe_draw_and_compute_angle(frame, l1, l2, l3, color, get_coords):
        if l1.visibility > 0.5 and l2.visibility > 0.5 and l3.visibility > 0.5:
            p1 = get_coords(l1)
            p2 = get_coords(l2)
            p3 = get_coords(l3)
            angle = calculate_angle(p1, p2, p3)
            conf = min(l1.visibility, l2.visibility, l3.visibility)
            draw_bold_line(frame, p1, p2, color, 4)
            draw_bold_line(frame, p2, p3, color, 4)
            draw_text_with_outline(frame, f"{int(angle)}°", p2, 0.8, color)
            return angle, conf
        return None, None

    def ray_segment_intersection(ray_origin, ray_direction, pt1, pt2):
        segment_vec = pt2 - pt1
        cross_val = np.cross(ray_direction, segment_vec)
        if abs(cross_val) < 1e-6:
            return None
        diff = pt1 - ray_origin
        t = np.cross(diff, segment_vec) / cross_val
        s = np.cross(diff, ray_direction) / cross_val
        if t >= 0 and 0 <= s <= 1:
            intersection_point = ray_origin + t * ray_direction
            return intersection_point, t
        return None

    def calculate_curvature_and_trust(frame, results):
        if not results.pose_landmarks:
            return 0, 0, frame

        landmarks = results.pose_landmarks.landmark
        h, w = frame.shape[:2]

        # Extract key points
        left_shoulder = np.array(
            [
                landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].x * w,
                landmarks[mp_pose.PoseLandmark.LEFT_SHOULDER].y * h,
            ]
        )
        right_shoulder = np.array(
            [
                landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].x * w,
                landmarks[mp_pose.PoseLandmark.RIGHT_SHOULDER].y * h,
            ]
        )
        left_hip = np.array(
            [
                landmarks[mp_pose.PoseLandmark.LEFT_HIP].x * w,
                landmarks[mp_pose.PoseLandmark.LEFT_HIP].y * h,
            ]
        )
        right_hip = np.array(
            [
                landmarks[mp_pose.PoseLandmark.RIGHT_HIP].x * w,
                landmarks[mp_pose.PoseLandmark.RIGHT_HIP].y * h,
            ]
        )
        nose = np.array(
            [
                landmarks[mp_pose.PoseLandmark.NOSE].x * w,
                landmarks[mp_pose.PoseLandmark.NOSE].y * h,
            ]
        )

        # Compute midpoints and central line
        shoulder_mid = (left_shoulder + right_shoulder) / 2
        hip_mid = (left_hip + right_hip) / 2
        line_a_mid = (shoulder_mid + hip_mid) / 2

        # Determine the true perpendicular vector to the shoulder-hip line.
        direction_vector = hip_mid - shoulder_mid
        dx, dy = direction_vector
        perpendicular_vector = np.array([-dy, dx], dtype=np.float32)
        perpendicular_vector /= np.linalg.norm(perpendicular_vector) + 1e-6

        # Ensure the perpendicular vector points away from the face.
        torso_center_to_nose = nose - line_a_mid
        if np.dot(perpendicular_vector, torso_center_to_nose) > 0:
            perpendicular_vector *= -1

        # Compute trust based on torso aspect ratio.
        torso_width = np.linalg.norm(left_shoulder - right_shoulder)
        torso_height = np.linalg.norm(shoulder_mid - hip_mid)
        aspect_ratio = torso_height / (torso_width + 1e-6)
        trust = np.clip(aspect_ratio / 2.5, 0, 1)

        # Use segmentation mask to find intersection of the ray with the back contour.
        mask = (results.segmentation_mask > 0.5).astype("uint8") * 255
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        point_a = None
        best_t = np.inf

        if contours:
            contour = contours[0][:, 0, :]
            for i in range(len(contour) - 1):
                pt1 = contour[i].astype(np.float32)
                pt2 = contour[i + 1].astype(np.float32)
                result = ray_segment_intersection(
                    line_a_mid, perpendicular_vector, pt1, pt2
                )
                if result is not None:
                    intersection_point, t_val = result
                    if t_val < best_t:
                        best_t = t_val
                        point_a = intersection_point
            # Check last segment connecting end to beginning (closed contour)
            pt1 = contour[-1].astype(np.float32)
            pt2 = contour[0].astype(np.float32)
            result = ray_segment_intersection(
                line_a_mid, perpendicular_vector, pt1, pt2
            )
            if result is not None:
                intersection_point, t_val = result
                if t_val < best_t:
                    best_t = t_val
                    point_a = intersection_point

        if point_a is not None:
            distance = np.linalg.norm(point_a - line_a_mid)
            # Instead of using torso_height alone, normalize by overall body size:
            spine_length = np.linalg.norm(shoulder_mid - hip_mid)
            neck_length = np.linalg.norm(nose - shoulder_mid)
            body_size = spine_length + neck_length
            curvature = distance / (body_size + 1e-6)
        else:
            curvature = 0

        debug_frame = frame.copy()
        if point_a is not None:
            cv2.line(
                debug_frame,
                tuple(shoulder_mid.astype(int)),
                tuple(hip_mid.astype(int)),
                (0, 255, 0),
                2,
            )
            perp_length = 100
            perp_end = line_a_mid + perpendicular_vector * perp_length
            cv2.line(
                debug_frame,
                tuple(line_a_mid.astype(int)),
                tuple(perp_end.astype(int)),
                (255, 0, 0),
                2,
            )
            cv2.line(
                debug_frame,
                tuple(line_a_mid.astype(int)),
                tuple(point_a.astype(int)),
                (0, 165, 255),
                2,
            )
            cv2.circle(debug_frame, tuple(point_a.astype(int)), 5, (0, 0, 255), -1)

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

        return curvature, trust, debug_frame

    def process_posture_angles(frame, results):
        h, w = frame.shape[:2]
        get_coords = lambda l: (int(l.x * w), int(l.y * h))
        angles = {
            "neckAngle": {"value": None, "confidence": None},
            "backAngle": {"value": None, "confidence": None},
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

        landmarks = results.pose_landmarks.landmark
        mp_drawing.draw_landmarks(
            frame, results.pose_landmarks, mp_pose.POSE_CONNECTIONS
        )

        # Neck Angle
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
                shoulder_mid_coord[1] / h,
                min(left_shoulder.visibility, right_shoulder.visibility),
            )
            fake_hip = FakeLandmark(
                hip_mid_coord[0] / w,
                hip_mid_coord[1] / h,
                min(left_hip.visibility, right_hip.visibility),
            )
            angle, conf = safe_draw_and_compute_angle(
                frame, nose, fake_shoulder, fake_hip, (0, 255, 0), get_coords
            )
            angles["neckAngle"]["value"] = angle
            angles["neckAngle"]["confidence"] = conf

        # Back Angle (using left-side landmarks)
        left_knee = landmarks[mp_pose.PoseLandmark.LEFT_KNEE]
        angle, conf = safe_draw_and_compute_angle(
            frame, left_knee, left_hip, left_shoulder, (255, 255, 0), get_coords
        )
        angles["backAngle"]["value"] = angle
        angles["backAngle"]["confidence"] = conf

        # Left Arm Angle
        left_elbow = landmarks[mp_pose.PoseLandmark.LEFT_ELBOW]
        left_wrist = landmarks[mp_pose.PoseLandmark.LEFT_WRIST]
        angle, conf = safe_draw_and_compute_angle(
            frame, left_shoulder, left_elbow, left_wrist, (0, 0, 255), get_coords
        )
        angles["armAngle"][1]["value"] = angle
        angles["armAngle"][1]["confidence"] = conf

        # Right Arm Angle
        right_elbow = landmarks[mp_pose.PoseLandmark.RIGHT_ELBOW]
        right_wrist = landmarks[mp_pose.PoseLandmark.RIGHT_WRIST]
        angle, conf = safe_draw_and_compute_angle(
            frame, right_shoulder, right_elbow, right_wrist, (255, 0, 255), get_coords
        )
        angles["armAngle"][2]["value"] = angle
        angles["armAngle"][2]["confidence"] = conf

        # Left Knee Angle
        left_ankle = landmarks[mp_pose.PoseLandmark.LEFT_ANKLE]
        angle, conf = safe_draw_and_compute_angle(
            frame, left_hip, left_knee, left_ankle, (255, 165, 0), get_coords
        )
        angles["kneeAngle"][1]["value"] = angle
        angles["kneeAngle"][1]["confidence"] = conf

        # Right Knee Angle
        right_knee = landmarks[mp_pose.PoseLandmark.RIGHT_KNEE]
        right_ankle = landmarks[mp_pose.PoseLandmark.RIGHT_ANKLE]
        angle, conf = safe_draw_and_compute_angle(
            frame, right_hip, right_knee, right_ankle, (255, 165, 0), get_coords
        )
        angles["kneeAngle"][2]["value"] = angle
        angles["kneeAngle"][2]["confidence"] = conf

        return angles

    def update_posture_data():
        global smoothed_curvature, brk
        cap = cv2.VideoCapture(VIDEO_SOURCE)
        cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        display_scale = 1

        while cap.isOpened() and not brk:
            ret, frame = cap.read()
            if not ret:
                break

            frame = cv2.resize(frame, (640, 480))
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            results = pose.process(frame_rgb)

            curvature, trust, debug_frame = calculate_curvature_and_trust(
                frame, results
            )
            angle_data = process_posture_angles(debug_frame, results)

            # Apply exponential smoothing to the curvature value
            if smoothed_curvature is None:
                smoothed_curvature = curvature
            elif curvature > 0:
                smoothed_curvature = (
                    alpha * curvature + (1 - alpha) * smoothed_curvature
                )

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

            with posture_data_lock:
                posture_data["timestamp"] = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
                posture_data["curvature"] = smoothed_curvature
                posture_data["trust"] = trust
                posture_data["neckAngle"] = angle_data["neckAngle"]
                posture_data["backAngle"] = angle_data["backAngle"]
                posture_data["armAngle"] = angle_data["armAngle"]
                posture_data["kneeAngle"] = angle_data["kneeAngle"]
                posture_data["postureStatus"] = (
                    "BAD" if (trust > 0.7 and smoothed_curvature > 0.45) else "GOOD"
                )

            frame_display = cv2.resize(
                debug_frame, None, fx=display_scale, fy=display_scale
            )
            cv2.imshow("Pose Detection", frame_display)
            if cv2.waitKey(10) & 0xFF == ord("q"):
                brk = True
                break

            time.sleep(0.03)

        cap.release()
        cv2.destroyAllWindows()

    update_posture_data()


# ------------------ Main Entry Point ------------------
if __name__ == "__main__":
    load_dotenv()
    WS_SERVER = os.getenv("WS_SERVER")

    if not os.getenv("DEVICE_ID"):
        print("Requesting device ID from server...")
        request_device_id(WS_SERVER)
    else:
        print("Device ID found:", os.getenv("DEVICE_ID"))

    DEVICE_ID = os.getenv("DEVICE_ID")

    posture_thread = threading.Thread(target=posture_detection)
    ws_thread = threading.Thread(
        target=run_main_ws_func,
        args=(
            WS_SERVER,
            DEVICE_ID,
        ),
    )

    posture_thread.start()
    ws_thread.start()

    posture_thread.join()

    brk = True
    ws_thread.join()

    print("Exiting...")
