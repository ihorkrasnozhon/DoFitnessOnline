import { Keypoint } from "@tensorflow-models/pose-detection";
import { getAngle } from "./PoseUtils";

interface ArmBendState {
    leftCount: number;
    rightCount: number;
    leftArmUp: boolean;
    rightArmUp: boolean;
}

let lastHints = { left: "", right: "", sync: "" };
let lastHintTime = 0;

export const updateArmBendCount = (keypoints: Keypoint[], state: ArmBendState) => {
    let { leftCount, rightCount, leftArmUp, rightArmUp } = state;

    const leftShoulder = keypoints.find((p: Keypoint) => p.name === "left_shoulder");
    const leftElbow = keypoints.find((p: Keypoint) => p.name === "left_elbow");
    const leftWrist = keypoints.find((p: Keypoint) => p.name === "left_wrist");

    const rightShoulder = keypoints.find((p: Keypoint) => p.name === "right_shoulder");
    const rightElbow = keypoints.find((p: Keypoint) => p.name === "right_elbow");
    const rightWrist = keypoints.find((p: Keypoint) => p.name === "right_wrist");

    let leftHint = "";
    let rightHint = "";
    let syncHint = "";

    let leftAngle = 0;
    let rightAngle = 0;

    if (leftShoulder && leftElbow && leftWrist) {
        leftAngle = getAngle(leftShoulder, leftElbow, leftWrist);
        if (leftAngle > 160 && !leftArmUp) {
            leftCount += 1;
            leftArmUp = true;
        } else if (leftAngle < 40 && leftArmUp) {
            leftArmUp = false;
        }
    }

    if (rightShoulder && rightElbow && rightWrist) {
        rightAngle = getAngle(rightShoulder, rightElbow, rightWrist);
        if (rightAngle > 160 && !rightArmUp) {
            rightCount += 1;
            rightArmUp = true;
        } else if (rightAngle < 40 && rightArmUp) {
            rightArmUp = false;
        }
    }

    return { leftCount, rightCount, leftArmUp, rightArmUp };
};
