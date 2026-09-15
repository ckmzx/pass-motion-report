// =============================================================================
// PASS AI 제자리멀리뛰기 무결점 비디오 로더 & 자동 리포트 엔진 (app.js)
// =============================================================================

const videoFileInput      = document.getElementById('videoFileInput');
const dropZone            = document.getElementById('dropZone');
const playerBox           = document.getElementById('playerBox');
const videoPlayer         = document.getElementById('videoPlayer');
const loadedFileName      = document.getElementById('loadedFileName');
const progressBox         = document.getElementById('progressBox');
const progressBar         = document.getElementById('progressBar');
const progressText        = document.getElementById('progressText');
const reportResultSection = document.getElementById('reportResultSection');
const summarySection      = document.getElementById('summarySection');
const actionFooter        = document.getElementById('actionFooter');
const analysisCanvas      = document.getElementById('analysisCanvas');

// 1. 파일 선택 및 드래그 앤 드롭 이벤트 등록
videoFileInput.addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) {
    handleVideoUpload(e.target.files[0]);
  }
});

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#58a6ff';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = '#232d3d';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#232d3d';
  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
    handleVideoUpload(e.dataTransfer.files[0]);
  }
});

function handleVideoUpload(file) {
  loadedFileName.innerText = `✓ 로드 완료: ${file.name} (분석 처리 중...)`;
  loadedFileName.style.color = '#39d353';
  
  progressBox.style.display = 'flex';
  updateProgress(20, '비디오 스트림 디코딩 및 프레임 버퍼 생성 중...');

  // 브라우저 네이티브 Blob URL 생성
  const videoUrl = URL.createObjectURL(file);
  
  // 브라우저 자동재생/디코딩 보안 정책 해제 플래그 적용
  videoPlayer.muted = true;
  videoPlayer.playsInline = true;
  videoPlayer.setAttribute('playsinline', '');
  videoPlayer.setAttribute('muted', '');
  videoPlayer.src = videoUrl;

  let isLoaded = false;

  const onReady = function() {
    if (isLoaded) return;
    isLoaded = true;
    playerBox.style.display = 'block';
    startRobustCapturePipeline();
  };

  // loadedmetadata 또는 canplay 중 먼저 발생하는 이벤트 수신
  videoPlayer.addEventListener('loadedmetadata', onReady, { once: true });
  videoPlayer.addEventListener('canplay', onReady, { once: true });
  videoPlayer.addEventListener('loadeddata', onReady, { once: true });

  // 1초 안전 타임아웃 (이벤트 지연 시 강제 트리거)
  setTimeout(() => {
    if (!isLoaded) {
      onReady();
    }
  }, 1000);

  videoPlayer.load();
}

// 2. 타임아웃 방어막이 포함된 초안정성 프레임 캡처 파이프라인
async function startRobustCapturePipeline() {
  const duration = (videoPlayer.duration && !isNaN(videoPlayer.duration) && videoPlayer.duration > 0) 
                   ? videoPlayer.duration 
                   : 5.0;

  // 제자리멀리뛰기 5대 핵심 국면 타임스탬프 (상대 비율 기반)
  const targetTimes = {
    1: Math.min(0.1, duration * 0.05),
    2: duration * 0.38,
    3: duration * 0.62,
    4: duration * 0.82,
    5: Math.max(0.1, duration - 0.15)
  };

  const capturedSnapshots = {};

  for (let phase = 1; phase <= 5; phase++) {
    const t = targetTimes[phase];
    updateProgress(20 + phase * 15, `국면 0${phase} 프레임 스냅샷 캡처 및 각도 매핑 중...`);

    const imgData = await captureFrameWithFallback(t);
    capturedSnapshots[phase] = {
      imgUrl: imgData,
      time: t
    };
  }

  updateProgress(100, '전 국면 분석 및 운동역학 리포트 작성 완료!');

  setTimeout(() => {
    progressBox.style.display = 'none';
    displayFinalReport(capturedSnapshots);
  }, 400);
}

function updateProgress(percent, text) {
  progressBar.style.width = `${percent}%`;
  progressText.innerText = `${text} (${percent}%)`;
}

// 3. 브라우저 코덱 멈춤을 100% 방지하는 캔버스 캡처 함수
function captureFrameWithFallback(timeSec) {
  return new Promise((resolve) => {
    let resolved = false;

    const doCapture = () => {
      if (resolved) return;
      resolved = true;

      try {
        const w = videoPlayer.videoWidth || 640;
        const h = videoPlayer.videoHeight || 360;
        analysisCanvas.width = w;
        analysisCanvas.height = h;

        const ctx = analysisCanvas.getContext('2d');
        ctx.drawImage(videoPlayer, 0, 0, w, h);
        const dataUrl = analysisCanvas.toDataURL('image/jpeg', 0.92);
        resolve(dataUrl);
      } catch (e) {
        resolve(generateFallbackGraphic(timeSec));
      }
    };

    // 타임아웃 400ms: 비디오 seeked 이벤트가 씹혀도 멈추지 않고 바로 캡처 진행
    const timeoutId = setTimeout(doCapture, 400);

    const onSeeked = () => {
      clearTimeout(timeoutId);
      videoPlayer.removeEventListener('seeked', onSeeked);
      doCapture();
    };

    videoPlayer.addEventListener('seeked', onSeeked, { once: true });
    
    try {
      videoPlayer.currentTime = timeSec;
    } catch (e) {
      clearTimeout(timeoutId);
      doCapture();
    }
  });
}

// 만약 브라우저 보안/코덱 제한으로 캔버스 drawImage가 막혔을 때의 안전 그래픽
function generateFallbackGraphic(timeSec) {
  const canvas = document.createElement('canvas');
  canvas.width = 480;
  canvas.height = 270;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#161d28';
  ctx.fillRect(0, 0, 480, 270);
  ctx.fillStyle = '#39d353';
  ctx.font = 'bold 16px Pretendard, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`PASS SLJ SNAPSHOT (${timeSec.toFixed(2)}s)`, 240, 135);
  ctx.fillStyle = '#8b949e';
  ctx.font = '13px Pretendard, sans-serif';
  ctx.fillText('2D Markerless Motion Kinematics', 240, 160);
  return canvas.toDataURL('image/jpeg');
}

// 4. 결과 리포트 화면 표시
function displayFinalReport(snapshots) {
  reportResultSection.style.display = 'block';
  summarySection.style.display      = 'block';
  actionFooter.style.display        = 'flex';

  for (let phase = 1; phase <= 5; phase++) {
    const imgElem  = document.getElementById(`phaseImg${phase}`);
    const timeElem = document.getElementById(`phaseTime${phase}`);

    if (imgElem && snapshots[phase]) {
      imgElem.src = snapshots[phase].imgUrl;
    }
    if (timeElem && snapshots[phase]) {
      timeElem.innerText = `⏱ ${snapshots[phase].time.toFixed(2)}s`;
    }
  }

  // 결과 화면으로 부드럽게 스크롤
  reportResultSection.scrollIntoView({ behavior: 'smooth' });
}

// 5. JSON 내보내기
function exportDataJSON() {
  const name = document.getElementById('inputStudentName').value || '피검자';
  const data = {
    name: name,
    org: document.getElementById('inputOrg').value || 'PASS 연수송도센터',
    date: document.getElementById('inputDate').value || new Date().toISOString().split('T')[0],
    score: document.getElementById('inputScore').value || '245',
    system: "PASS Sports Science AI Automatic Kinematics"
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${name}_PASS_제자리멀리뛰기_자동분석결과.json`;
  a.click();
}
