export const calculateAngle = (A: any, B: any, C: any) => {
    const radians = Math.atan2(C.y - B.y, C.x - B.x) - Math.atan2(A.y - B.y, A.x - B.x);
    let angle = Math.abs((radians * 180.0) / Math.PI);
    if (angle > 180.0) angle = 360 - angle;
    return angle;
};

export const isPlankCorrect = (keypoints: any[]) => {
    const getPoint = (name: string) => keypoints.find(k => k.name === name);

    const shoulder = getPoint('left_shoulder') || getPoint('right_shoulder');
    const hip = getPoint('left_hip') || getPoint('right_hip');
    const ankle = getPoint('left_ankle') || getPoint('right_ankle');

    if (shoulder?.score > 0.3 && hip?.score > 0.3 && ankle?.score > 0.3) {
        const angle = calculateAngle(shoulder, hip, ankle);
        // Планка считается правильной, если тело почти прямое (165-195 градусов)
        return angle > 160 && angle < 200;
    }
    return false;
};
