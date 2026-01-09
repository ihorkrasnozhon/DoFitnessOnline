import * as poseDetection from "@tensorflow-models/pose-detection";
import * as tf from "@tensorflow/tfjs";

declare global {
    interface Window {
        tf: typeof tf;
        poseDetection: typeof poseDetection;
    }
}

export const initDetector = async () => {
    const globalTf = typeof window.tf !== 'undefined' ? window.tf : tf;
    const globalPoseDetection = typeof window.poseDetection !== 'undefined' ? window.poseDetection : poseDetection;

    if (!globalTf || !globalPoseDetection) {
        throw new Error("TensorFlow.js или Pose Detection не загружены. Проверьте CDN.");
    }

    await globalTf.setBackend("webgl");
    await globalTf.ready();

    return globalPoseDetection.createDetector(globalPoseDetection.SupportedModels.MoveNet, {
        modelType: globalPoseDetection.movenet.modelType.SINGLEPOSE_LIGHTNING,
    });
};

export const drawPose = (ctx: CanvasRenderingContext2D, keypoints: poseDetection.Keypoint[]) => {
    keypoints.forEach((point) => {
        if (point.score && point.score > 0.4) {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 5, 0, 2 * Math.PI);
            ctx.fillStyle = "lime";
            ctx.fill();
        }
    });

    const drawLine = (p1: poseDetection.Keypoint | undefined, p2: poseDetection.Keypoint | undefined, color: string) => {
        if (!p1 || !p2 || !p1.score || !p2.score) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
    };

    const leftShoulder = keypoints.find((p) => p.name === "left_shoulder");
    const leftElbow = keypoints.find((p) => p.name === "left_elbow");
    const leftWrist = keypoints.find((p) => p.name === "left_wrist");

    const rightShoulder = keypoints.find((p) => p.name === "right_shoulder");
    const rightElbow = keypoints.find((p) => p.name === "right_elbow");
    const rightWrist = keypoints.find((p) => p.name === "right_wrist");

    drawLine(leftShoulder, leftElbow, "lime");
    drawLine(leftElbow, leftWrist, "lime");
    drawLine(rightShoulder, rightElbow, "cyan");
    drawLine(rightElbow, rightWrist, "cyan");

    return { leftShoulder, leftElbow, leftWrist, rightShoulder, rightElbow, rightWrist };
};

export const getAngle = (A: poseDetection.Keypoint, B: poseDetection.Keypoint, C: poseDetection.Keypoint) => {
    const AB = { x: A.x - B.x, y: A.y - B.y };
    const CB = { x: C.x - B.x, y: C.y - B.y };
    const dot = AB.x * CB.x + AB.y * CB.y;
    const magAB = Math.sqrt(AB.x ** 2 + AB.y ** 2);
    const magCB = Math.sqrt(CB.x ** 2 + CB.y ** 2);
    const angleRad = Math.acos(dot / (magAB * magCB));
    return (angleRad * 180) / Math.PI;
};

const isKeypointVisible = (kp: poseDetection.Keypoint | undefined, minConfidence: number): kp is poseDetection.Keypoint & { score: number } => {
    return kp !== undefined && kp.score !== undefined && kp.score >= minConfidence;
};


export const checkReadyPose = (keypoints: poseDetection.Keypoint[]) => {
    const MIN_CONFIDENCE = 0.4;
    const STRAIGHT_ARM_ANGLE = 170;
    const HORIZONTAL_ALIGNMENT_THRESHOLD = 50;

    const leftShoulder = keypoints.find((p) => p.name === "left_shoulder");
    const leftElbow = keypoints.find((p) => p.name === "left_elbow");
    const leftWrist = keypoints.find((p) => p.name === "left_wrist");
    const rightShoulder = keypoints.find((p) => p.name === "right_shoulder");
    const rightElbow = keypoints.find((p) => p.name === "right_elbow");
    const rightWrist = keypoints.find((p) => p.name === "right_wrist");

    if (!isKeypointVisible(leftShoulder, MIN_CONFIDENCE) ||
        !isKeypointVisible(leftElbow, MIN_CONFIDENCE) ||
        !isKeypointVisible(leftWrist, MIN_CONFIDENCE) ||
        !isKeypointVisible(rightShoulder, MIN_CONFIDENCE) ||
        !isKeypointVisible(rightElbow, MIN_CONFIDENCE) ||
        !isKeypointVisible(rightWrist, MIN_CONFIDENCE)) {
        return false;
    }

    const leftAngle = getAngle(leftShoulder, leftElbow, leftWrist);
    const rightAngle = getAngle(rightShoulder, rightElbow, rightWrist);
    const armsStraight = leftAngle > STRAIGHT_ARM_ANGLE && rightAngle > STRAIGHT_ARM_ANGLE;

    if (!armsStraight) {
        return false;
    }

    const leftAligned = Math.abs(leftWrist.x - leftShoulder.x) < HORIZONTAL_ALIGNMENT_THRESHOLD &&
        Math.abs(leftElbow.x - leftShoulder.x) < HORIZONTAL_ALIGNMENT_THRESHOLD;

    const rightAligned = Math.abs(rightWrist.x - rightShoulder.x) < HORIZONTAL_ALIGNMENT_THRESHOLD &&
        Math.abs(rightElbow.x - rightShoulder.x) < HORIZONTAL_ALIGNMENT_THRESHOLD;

    return armsStraight && leftAligned && rightAligned;
};

export const checkEndPose = (keypoints: poseDetection.Keypoint[]) => {
    const MIN_CONFIDENCE = 0.5;
    const VERTICAL_RAISE_THRESHOLD = 20;

    const leftShoulder = keypoints.find((p) => p.name === "left_shoulder");
    const leftWrist = keypoints.find((p) => p.name === "left_wrist");
    const rightShoulder = keypoints.find((p) => p.name === "right_shoulder");
    const rightWrist = keypoints.find((p) => p.name === "right_wrist");

    const leftElbow = keypoints.find((p) => p.name === "left_elbow");
    const rightElbow = keypoints.find((p) => p.name === "right_elbow");

    if (!isKeypointVisible(leftShoulder, MIN_CONFIDENCE) ||
        !isKeypointVisible(leftWrist, MIN_CONFIDENCE) ||
        !isKeypointVisible(rightShoulder, MIN_CONFIDENCE) ||
        !isKeypointVisible(rightWrist, MIN_CONFIDENCE) ||
        !isKeypointVisible(leftElbow, MIN_CONFIDENCE) ||
        !isKeypointVisible(rightElbow, MIN_CONFIDENCE)) {
        return false;
    }

    const leftRaised = leftWrist.y < leftShoulder.y - VERTICAL_RAISE_THRESHOLD;
    const rightRaised = rightWrist.y < rightShoulder.y - VERTICAL_RAISE_THRESHOLD;

    const leftAngle = getAngle(leftShoulder, leftElbow, leftWrist);
    const rightAngle = getAngle(rightShoulder, rightElbow, rightWrist);
    const armsRelativelyStraight = leftAngle > 140 && rightAngle > 140;

    if (!armsRelativelyStraight) return false;

    return leftRaised && rightRaised;
};
