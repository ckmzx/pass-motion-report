# ==============================================================================
# 2D 마커리스 제자리멀리뛰기 영상 분석 파이프라인 (imageio-ffmpeg 내장 웹표준 H.264 인코더)
# ==============================================================================

library(reticulate)
library(tidyverse)

# 1. 가상환경 연결
use_virtualenv("C:/Users/chokm/jump_analysis/venv", required = TRUE)

# 2. imageio 및 imageio-ffmpeg 자동 설치 (외부 FFmpeg 설치 없이 H.264 완전 지원)
py_run_string("
import sys
import subprocess
try:
    import imageio
except ImportError:
    subprocess.check_call([sys.executable, '-m', 'pip', 'install', 'imageio', 'imageio-ffmpeg'])
")

# 3. 파이썬 기반 비디오 분석 코어 엔진 (imageio H.264 직접 렌더링)
py_run_string("
import cv2
import numpy as np
import pandas as pd
import imageio
from ultralytics import YOLO

def calc_angle_py(p1, p2, p3):
    p1 = np.array(p1, dtype=float)
    p2 = np.array(p2, dtype=float)
    p3 = np.array(p3, dtype=float)
    v1 = p1 - p2
    v2 = p3 - p2
    dot_val = np.dot(v1, v2)
    norm_val = np.linalg.norm(v1) * np.linalg.norm(v2) + 1e-6
    cosine = np.clip(dot_val / norm_val, -1.0, 1.0)
    return float(np.degrees(np.arccos(cosine)))

def process_jump_video_core(video_path, out_video_path, out_csv_path):
    model = YOLO('yolov8n-pose.pt')
    cap = cv2.VideoCapture(video_path)
    
    if not cap.isOpened():
        raise ValueError(f'비디오를 열 수 없습니다: {video_path}')
        
    width  = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
    height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
    fps    = cap.get(cv2.CAP_PROP_FPS)
    if fps <= 0 or np.isnan(fps):
        fps = 30.0

    # 브라우저 100% 호환 H.264 (yuv420p) 라이터 생성
    writer = imageio.get_writer(
        out_video_path,
        fps=fps,
        codec='libx264',
        pixelformat='yuv420p',
        quality=8,
        macro_block_size=None
    )
    
    skeleton_pairs = [
        (5, 7), (7, 9), (6, 8), (8, 10), (5, 6),
        (5, 11), (6, 12), (11, 12),
        (11, 13), (13, 15), (12, 14), (14, 16)
    ]
    
    records = []
    frame_idx = 0
    
    while cap.isOpened():
        ret, frame = cap.read()
        if not ret:
            break
            
        time_sec = frame_idx / fps
        results = model(frame, verbose=False)
        
        angles = {
            'left_knee': None, 'right_knee': None,
            'left_hip': None, 'right_hip': None,
            'left_elbow': None, 'right_elbow': None
        }
        
        if results[0].keypoints is not None and len(results[0].boxes) > 0:
            kp = results[0].keypoints.xy[0].cpu().numpy()
            box = results[0].boxes[0].xyxy[0].cpu().numpy()
            
            # 바운딩 박스
            x1, y1, x2, y2 = map(int, box)
            cv2.rectangle(frame, (x1, y1), (x2, y2), (255, 0, 0), 2)
            cv2.putText(frame, 'person 0', (x1, y1 - 8), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
            
            # 스켈레톤 선
            for p1_i, p2_i in skeleton_pairs:
                if kp[p1_i][0] > 0 and kp[p2_i][0] > 0:
                    pt1 = tuple(map(int, kp[p1_i]))
                    pt2 = tuple(map(int, kp[p2_i]))
                    cv2.line(frame, pt1, pt2, (0, 255, 0), 2)
                    
            # 키포인트 점
            for pt in kp:
                if pt[0] > 0 and pt[1] > 0:
                    cv2.circle(frame, tuple(map(int, pt)), 4, (0, 255, 0), -1)
                    
            # 관절각 계산
            if kp[11][0] > 0 and kp[13][0] > 0 and kp[15][0] > 0:
                angles['left_knee'] = calc_angle_py(kp[11], kp[13], kp[15])
                cv2.putText(frame, f\"{angles['left_knee']:.1f}\", (int(kp[13][0]) + 8, int(kp[13][1])),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
                            
            if kp[12][0] > 0 and kp[14][0] > 0 and kp[16][0] > 0:
                angles['right_knee'] = calc_angle_py(kp[12], kp[14], kp[16])
                
            if kp[5][0] > 0 and kp[11][0] > 0 and kp[13][0] > 0:
                angles['left_hip'] = calc_angle_py(kp[5], kp[11], kp[13])
                cv2.putText(frame, f\"{angles['left_hip']:.1f}\", (int(kp[11][0]) + 8, int(kp[11][1])),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.45, (255, 255, 255), 1)
                            
            if kp[6][0] > 0 and kp[12][0] > 0 and kp[14][0] > 0:
                angles['right_hip'] = calc_angle_py(kp[6], kp[12], kp[14])
                
            if kp[5][0] > 0 and kp[7][0] > 0 and kp[9][0] > 0:
                angles['left_elbow'] = calc_angle_py(kp[5], kp[7], kp[9])
            if kp[6][0] > 0 and kp[8][0] > 0 and kp[10][0] > 0:
                angles['right_elbow'] = calc_angle_py(kp[6], kp[8], kp[10])
                
        # 좌측 상단 HUD 수치 출력
        cv2.putText(frame, f'Frame: {frame_idx} | Time: {time_sec:.3f}s', (15, 25),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 255, 0), 1)
                    
        hud_y = 45
        for name, val in angles.items():
            txt = f'{name:<12}: {val:>5.1f} deg' if val is not None else f'{name:<12}:    NA'
            cv2.putText(frame, txt, (15, hud_y), cv2.FONT_HERSHEY_SIMPLEX, 0.42, (255, 255, 255), 1)
            hud_y += 18
            
        row = {'frame': frame_idx, 'time_s': time_sec}
        row.update(angles)
        records.append(row)
        
        # OpenCV (BGR) -> imageio (RGB) 색상 변환 후 H.264 프레임 기록
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        writer.append_data(frame_rgb)
        frame_idx += 1
        
    cap.release()
    writer.close()
    
    df_out = pd.DataFrame(records)
    df_out.to_csv(out_csv_path, index=False, encoding='utf-8-sig')
")

# 4. R 래퍼 함수 정의
analyze_jump_video <- function(video_file, output_video_file, output_csv_file) {
  dir.create(dirname(output_video_file), recursive = TRUE, showWarnings = FALSE)
  dir.create(dirname(output_csv_file),   recursive = TRUE, showWarnings = FALSE)
  
  py$process_jump_video_core(
    normalizePath(video_file, winslash = "/"),
    normalizePath(output_video_file, mustWork = FALSE, winslash = "/"),
    normalizePath(output_csv_file,   mustWork = FALSE, winslash = "/")
  )
  
  df_res <- readr::read_csv(output_csv_file, show_col_types = FALSE)
  return(df_res)
}

# 5. 일괄 실행
setwd("C:/Users/chokm/jump_analysis")
video_files <- list.files("raw_videos", pattern = "\\.mp4$", full.names = TRUE)

for (v_file in video_files) {
  f_name <- tools::file_path_sans_ext(basename(v_file))
  out_v <- file.path("output_videos", paste0(f_name, "_analyzed.mp4"))
  out_c <- file.path("output_data", paste0(f_name, "_kinematics.csv"))
  message(">> [H.264 웹표준] 분석 인코딩 중: ", f_name)
  analyze_jump_video(v_file, out_v, out_c)
}
message(">> 전체 영상 H.264 웹표준 분석 완료!")
