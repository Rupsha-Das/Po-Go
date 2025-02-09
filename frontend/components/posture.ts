type PostureData = {
  action: string;
  trust: number;
  posture: {
    overall: string;
    trunk: string;
    neck: string;
    arm_left: string;
    arm_right: string;
    hip: string;
    knee: string;
  };
  backCurvature: { value: number | null; confidence: number | null };
  armAngleL: { value: number | null; confidence: number | null };
  armAngleR: { value: number | null; confidence: number | null };
  hipAngle: { value: number | null; confidence: number | null };
  kneeAngleL: { value: number | null; confidence: number | null };
  kneeAngleR: { value: number | null; confidence: number | null };
};

export default function analyzePosture(data: PostureData): {
  message: string;
  subMessages: string[];
} {
  if (data.action !== "update") {
    console.log("No update action, skipping analysis.");
    return { message: "No update action", subMessages: ["Skipping analysis"] };
  }

  let message = "Bad posture";
  let subMessages: string[] = [];

  if (data.posture.overall.toLowerCase() === "good") {
    return { message: "Posture is good", subMessages: ["Keep it up!"] };
  }

  const perfectBackCurvature = 0;
  const perfectArmAngle = 90;
  const perfectHipAngle = 90;
  const perfectKneeAngle = 90;

  const roundedValues = {
    backCurvature:
      data.backCurvature.value !== null
        ? Math.round(data.backCurvature.value)
        : null,
    armAngleL:
      data.armAngleL.value !== null ? Math.round(data.armAngleL.value) : null,
    armAngleR:
      data.armAngleR.value !== null ? Math.round(data.armAngleR.value) : null,
    hipAngle:
      data.hipAngle.value !== null ? Math.round(data.hipAngle.value) : null,
    kneeAngleL:
      data.kneeAngleL.value !== null ? Math.round(data.kneeAngleL.value) : null,
    kneeAngleR:
      data.kneeAngleR.value !== null ? Math.round(data.kneeAngleR.value) : null,
  };

  if (
    roundedValues.backCurvature !== null &&
    roundedValues.backCurvature > perfectBackCurvature
  ) {
    console.log("Advice: Keep your back straight up.");
    subMessages.push("Straighten your back.");
  }

  if (
    roundedValues.armAngleL !== null &&
    roundedValues.armAngleL !== perfectArmAngle
  ) {
    console.log("Advice: Straighten your left arm.");
    subMessages.push("Straighten your left arm.");
  }

  if (
    roundedValues.armAngleR !== null &&
    roundedValues.armAngleR !== perfectArmAngle
  ) {
    console.log("Advice: Straighten your right arm.");
    subMessages.push("Straighten your right arm.");
  }

  if (
    roundedValues.hipAngle !== null &&
    roundedValues.hipAngle !== perfectHipAngle
  ) {
    console.log("Alert: Adjust your hip position to 90 degrees.");
    subMessages.push("Adjust your hip to 90 degrees.");
  }

  if (
    roundedValues.kneeAngleL !== null &&
    roundedValues.kneeAngleL !== perfectKneeAngle
  ) {
    console.log("Alert: Adjust your left knee to 90 degrees.");
    subMessages.push("Adjust your left knee to 90 degrees.");
  }

  if (
    roundedValues.kneeAngleR !== null &&
    roundedValues.kneeAngleR !== perfectKneeAngle
  ) {
    console.log("Alert: Adjust your right knee to 90 degrees.");
    subMessages.push("Adjust your right knee to 90 degrees.");
  }

  return { message, subMessages };
}
