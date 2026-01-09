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

export const getAngle = (A: poseDetection.Keypoint, B: poseDetection.Keypoint, C: poseDetection.Keypoint) => {
    if (!A || !B || !C || (A.score && A.score < 0.3) || (B.score && B.score < 0.3) || (C.score && C.score < 0.3)) {
        return 180;
    }

    const AB = { x: A.x - B.x, y: A.y - B.y };
    const CB = { x: C.x - B.x, y: C.y - B.y };
    const dot = AB.x * CB.x + AB.y * CB.y;
    const magAB = Math.sqrt(AB.x ** 2 + AB.y ** 2);
    const magCB = Math.sqrt(CB.x ** 2 + CB.y ** 2);

    let angleRad = 0;
    if (magAB * magCB !== 0) {
        angleRad = Math.acos(Math.min(Math.max(dot / (magAB * magCB), -1), 1)); // Клампинг для предотвращения ошибок acos
    }

    return (angleRad * 180) / Math.PI;
};

export const drawPose = (ctx: CanvasRenderingContext2D, keypoints: poseDetection.Keypoint[]) => {
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#000000';

    const drawLine = (p1: poseDetection.Keypoint | undefined, p2: poseDetection.Keypoint | undefined, color: string) => {
        if (!p1 || !p2 || !p1.score || !p2.score || p1.score < 0.4 || p2.score < 0.4) return;
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.strokeStyle = color;
        ctx.lineWidth = 4;
        ctx.stroke();
    };

    const hipKeys = {
        leftHip: keypoints.find((p: poseDetection.Keypoint) => p.name === "left_hip"),
        rightHip: keypoints.find((p: poseDetection.Keypoint) => p.name === "right_hip"),
        leftKnee: keypoints.find((p: poseDetection.Keypoint) => p.name === "left_knee"),
        rightKnee: keypoints.find((p: poseDetection.Keypoint) => p.name === "right_knee"),
        leftAnkle: keypoints.find((p: poseDetection.Keypoint) => p.name === "left_ankle"),
        rightAnkle: keypoints.find((p: poseDetection.Keypoint) => p.name === "right_ankle"),
        leftShoulder: keypoints.find((p: poseDetection.Keypoint) => p.name === "left_shoulder"),
        rightShoulder: keypoints.find((p: poseDetection.Keypoint) => p.name === "right_shoulder"),
    };

    const torsoColor = "#0000FF";
    drawLine(hipKeys.leftShoulder, hipKeys.rightShoulder, torsoColor);
    drawLine(hipKeys.leftShoulder, hipKeys.leftHip, torsoColor);
    drawLine(hipKeys.rightShoulder, hipKeys.rightHip, torsoColor);
    drawLine(hipKeys.leftHip, hipKeys.rightHip, torsoColor);

    const legColor = "#FF0000";
    drawLine(hipKeys.leftHip, hipKeys.leftKnee, legColor);
    drawLine(hipKeys.leftKnee, hipKeys.leftAnkle, legColor);

    drawLine(hipKeys.rightHip, hipKeys.rightKnee, legColor);
    drawLine(hipKeys.rightKnee, hipKeys.rightAnkle, legColor);


    return hipKeys;
};
