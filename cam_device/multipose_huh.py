import cv2
import mediapipe as mp
import numpy as np

# Initialize MediaPipe modules
mp_pose = mp.solutions.pose
mp_selfie_segmentation = mp.solutions.selfie_segmentation
mp_drawing = mp.solutions.drawing_utils

# Initialize pose and segmentation models
pose = mp_pose.Pose()
segmentation = mp_selfie_segmentation.SelfieSegmentation(model_selection=1)

# Start webcam
cap = cv2.VideoCapture(0)

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break

    # Convert BGR to RGB
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

    # Perform segmentation (detect human regions)
    segment_results = segmentation.process(rgb_frame)

    # Create a mask for human regions
    mask = (segment_results.segmentation_mask > 0.5).astype(np.uint8) * 255

    # Find contours of detected people
    contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)

    for contour in contours:
        x, y, w, h = cv2.boundingRect(contour)

        # Extract person region and run pose estimation
        person_crop = frame[y:y+h, x:x+w]
        if person_crop.size > 0:
            rgb_crop = cv2.cvtColor(person_crop, cv2.COLOR_BGR2RGB)
            pose_results = pose.process(rgb_crop)

            if pose_results.pose_landmarks:
                mp_drawing.draw_landmarks(person_crop, pose_results.pose_landmarks, mp_pose.POSE_CONNECTIONS)

            # Overlay back
            frame[y:y+h, x:x+w] = person_crop

    # Show output
    cv2.imshow("Multi-Person Pose with MediaPipe", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()
