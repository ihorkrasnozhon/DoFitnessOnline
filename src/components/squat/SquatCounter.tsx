import { Keypoint } from "@tensorflow-models/pose-detection";
import { getAngle } from "./PoseUtils";

interface SquatState {
    count: number;
    isDown: boolean;
}

const SQUAT_DOWN_ANGLE = 100;
const SQUAT_UP_ANGLE = 160;

export const updateSquatCount = (keypoints: Keypoint[], state: SquatState) => {
    let { count, isDown } = state;

    const leftHip = keypoints.find((k) => k.name === "left_hip");
    const leftKnee = keypoints.find((k) => k.name === "left_knee");
    const leftAnkle = keypoints.find((k) => k.name === "left_ankle");
    const rightHip = keypoints.find((k) => k.name === "right_hip");
    const rightKnee = keypoints.find((k) => k.name === "right_knee");
    const rightAnkle = keypoints.find((k) => k.name === "right_ankle");

    if (leftHip && leftKnee && leftAnkle && rightHip && rightKnee && rightAnkle) {
        const leftKneeAngle = getAngle(leftHip, leftKnee, leftAnkle);
        const rightKneeAngle = getAngle(rightHip, rightKnee, rightAnkle);

        const minKneeAngle = Math.min(leftKneeAngle, rightKneeAngle);

        if (minKneeAngle < SQUAT_DOWN_ANGLE && !isDown) {
            isDown = true;
        } else if (minKneeAngle > SQUAT_UP_ANGLE && isDown) {
            count += 1;
            isDown = false;
        }
    }

    return { count, isDown };
};
