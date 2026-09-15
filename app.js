// =============================================================================
// PASS 제자리멀리뛰기 웹 리포트 완전 동작 엔진 (app.js)
// =============================================================================

const videoFileInput    = document.getElementById('videoFileInput');
const dropZone          = document.getElementById('dropZone');
const playerBox         = document.getElementById('playerBox');
const videoPlayer       = document.getElementById('videoPlayer');
const loadedFileName    = document.getElementById('loadedFileName');
const timeSlider        = document.getElementById('timeSlider');
const currentTimeLabel  = document.getElementById('currentTimeLabel');
const totalDurationLabel= document.getElementById('totalDurationLabel');
const btnPlayPause      = document.getElementById('btnPlayPause');
const btnPrevFrame      = document.getElementById('btnPrevFrame');
const btnNextFrame      = document.getElementById('btnNextFrame');
const btnSlowMotion     = document.getElementById('btnSlowMotion');

// 1. 비디오 파일 로드 이벤트 처리
videoFileInput.addEventListener('change', function(e) {
  if (e.target.files && e.target.files[0]) {
    loadSelectedVideo(e.target.files[0]);
  }
});

// 드래그 앤 드롭 지원
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
    loadSelectedVideo(e.dataTransfer.files[0]);
  }
});

function loadSelectedVideo(file) {
  const url = URL.createObjectURL(file);
  videoPlayer.src = url;
  videoPlayer.load();
  playerBox.style.display = 'flex';
  loadedFileName.innerText = `✓ 로드 완료: ${file.name}`;
  loadedFileName.style.color = '#39d353';
}

// 2. 비디오 재생 & 시간 슬라이더 동기화
videoPlayer.addEventListener('loadedmetadata', function() {
  timeSlider.max = videoPlayer.duration;
  totalDurationLabel.innerText = `${videoPlayer.duration.toFixed(2)}s`;
});

videoPlayer.addEventListener('timeupdate', function() {
  timeSlider.value = videoPlayer.currentTime;
  currentTimeLabel.innerText = `${videoPlayer.currentTime.toFixed(2)}s`;
});

timeSlider.addEventListener('input', function() {
  videoPlayer.currentTime = parseFloat(timeSlider.value);
});

btnPlayPause.addEventListener('click', function() {
  if (videoPlayer.paused || videoPlayer.ended) {
    videoPlayer.play();
    btnPlayPause.innerText = '⏸ 일시정지';
  } else {
    videoPlayer.pause();
    btnPlayPause.innerText = '▶ 재생';
  }
});

// 0.01초(프레임 단위) 정밀 이동
btnPrevFrame.addEventListener('click', function() {
  videoPlayer.pause();
  videoPlayer.currentTime = Math.max(0, videoPlayer.currentTime - 0.016);
  btnPlayPause.innerText = '▶ 재생';
});

btnNextFrame.addEventListener('click', function() {
  videoPlayer.pause();
  videoPlayer.currentTime = Math.min(videoPlayer.duration, videoPlayer.currentTime + 0.016);
  btnPlayPause.innerText = '▶ 재생';
});

// 슬로모션 토글
let isSlow = false;
btnSlowMotion.addEventListener('click', function() {
  isSlow = !isSlow;
  if (isSlow) {
    videoPlayer.playbackRate = 0.25;
    btnSlowMotion.style.background = '#58a6ff';
    btnSlowMotion.style.color = '#fff';
    btnSlowMotion.innerText = '⏱ 0.25배속 (ON)';
  } else {
    videoPlayer.playbackRate = 1.0;
    btnSlowMotion.style.background = '#21262d';
    btnSlowMotion.style.color = '#f0f6fc';
    btnSlowMotion.innerText = '⏱ 0.25배속';
  }
});

// 3. 현재 멈춘 장면을 특정 국면 사진으로 즉시 캡처/적용
function applySnapshotToPhase(phaseNum) {
  if (!videoPlayer.src) {
    alert('먼저 분석 완료된 MP4 영상을 업로드해주세요.');
    return;
  }

  videoPlayer.pause();
  btnPlayPause.innerText = '▶ 재생';

  const canvas = document.createElement('canvas');
  canvas.width = videoPlayer.videoWidth || 640;
  canvas.height = videoPlayer.videoHeight || 360;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(videoPlayer, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  
  const targetImg = document.getElementById(`phaseImg${phaseNum}`);
  const targetPlaceholder = document.getElementById(`imgPlaceholder${phaseNum}`);
  const targetTime = document.getElementById(`phaseTime${phaseNum}`);

  if (targetImg && targetPlaceholder) {
    targetImg.src = dataUrl;
    targetImg.style.display = 'block';
    targetPlaceholder.style.display = 'none';
  }

  if (targetTime) {
    targetTime.innerText = `⏱ ${videoPlayer.currentTime.toFixed(3)}s`;
  }
}

// 4. 각도 입력 시 실시간 역학 상태 자동 평가 엔진
function evaluatePhase1() {
  const knee = parseFloat(document.getElementById('valKnee1').value);
  const statusKnee = document.getElementById('statusKnee1');
  if (isNaN(knee)) return;

  if (knee >= 165) {
    statusKnee.className = 'status-pill good';
    statusKnee.innerText = '안정적 신전';
  } else {
    statusKnee.className = 'status-pill warn';
    statusKnee.innerText = '무릎 굴곡됨';
  }
}

function evaluatePhase2() {
  const knee = parseFloat(document.getElementById('valKnee2').value);
  const hip  = parseFloat(document.getElementById('valHip2').value);
  const statusKnee = document.getElementById('statusKnee2');
  const statusHip  = document.getElementById('statusHip2');
  const fbText     = document.getElementById('feedbackText2');

  if (!isNaN(knee)) {
    if (knee >= 70 && knee <= 85) {
      statusKnee.className = 'status-pill good';
      statusKnee.innerText = '최적 탄성 축적 (SSC 우수)';
      fbText.innerHTML = `무릎 최소각이 <strong>${knee}°</strong>로 대퇴사두근과 둔근의 신장-단축 주기(SSC) 탄성에너지를 극대화하기에 매우 이상적입니다.`;
    } else if (knee < 70) {
      statusKnee.className = 'status-pill warn';
      statusKnee.innerText = '과도한 주저앉음';
      fbText.innerHTML = `무릎 각도가 <strong>${knee}°</strong>로 과도하게 낮아 이륙 시 수직 분력 전환에 시간이 지체될 수 있습니다. 75° 내외 유지를 권장합니다.`;
    } else {
      statusKnee.className = 'status-pill warn';
      statusKnee.innerText = '굴곡 부족 (탄성 손실)';
      fbText.innerHTML = `무릎 각도가 <strong>${knee}°</strong>로 충분히 앉지 않아 하체 탄성에너지를 100% 활용하지 못하고 있습니다. 힙힌지를 더 깊게 잡으세요.`;
    }
  }

  if (!isNaN(hip)) {
    if (hip >= 65 && hip <= 80) {
      statusHip.className = 'status-pill good';
      statusHip.innerText = '깊은 힙힌지';
    } else {
      statusHip.className = 'status-pill warn';
      statusHip.innerText = '힌지 조절 필요';
    }
  }
}

function evaluatePhase3() {
  const knee   = parseFloat(document.getElementById('valKnee3').value);
  const launch = parseFloat(document.getElementById('valLaunch3').value);
  const statusKnee   = document.getElementById('statusKnee3');
  const statusLaunch = document.getElementById('statusLaunch3');
  const fbText       = document.getElementById('feedbackText3');

  if (!isNaN(knee)) {
    if (knee >= 160) {
      statusKnee.className = 'status-pill good';
      statusKnee.innerText = '트리플 익스텐션 우수';
    } else {
      statusKnee.className = 'status-pill warn';
      statusKnee.innerText = '조기 무릎 굽힘 (추진력 손실)';
    }
  }

  if (!isNaN(launch)) {
    if (launch >= 40 && launch <= 45) {
      statusLaunch.className = 'status-pill good';
      statusLaunch.innerText = '황금 투사각 (40°~45°)';
      fbText.innerHTML = `도약 투사각이 <strong>${launch}°</strong>로 수평 추진력과 체공고의 최적 밸런스를 달성했습니다. 완전 신전 후 지면을 끝까지 밀었습니다.`;
    } else if (launch < 40) {
      statusLaunch.className = 'status-pill warn';
      statusLaunch.innerText = '낮은 탄도 (체공시간 부족)';
      fbText.innerHTML = `투사각이 <strong>${launch}°</strong>로 낮아 수평 속도는 빠르나 체공 시간이 짧아 착지 시 다리를 뻗을 시간을 확보하기 어렵습니다.`;
    } else {
      statusLaunch.className = 'status-pill warn';
      statusLaunch.innerText = '과도한 상방 도약';
      fbText.innerHTML = `투사각이 <strong>${launch}°</strong>로 너무 높아 위로만 뜨고 전방 거리가 손실됩니다. 상체를 전방으로 더 밀어내세요.`;
    }
  }
}

function evaluatePhase4() {
  const knee = parseFloat(document.getElementById('valKnee4').value);
  const statusKnee = document.getElementById('statusKnee4');
  const fbText     = document.getElementById('feedbackText4');

  if (!isNaN(knee)) {
    if (knee <= 75) {
      statusKnee.className = 'status-pill good';
      statusKnee.innerText = '강력한 턱(Tuck) 굴곡';
      fbText.innerHTML = `공중에서 무릎을 <strong>${knee}°</strong>까지 타이트하게 당겨 체공 높이를 유지하며 전방 착지 뻗기 준비가 완벽합니다.`;
    } else {
      statusKnee.className = 'status-pill warn';
      statusKnee.innerText = '당기기 높이 부족';
      fbText.innerHTML = `무릎 굴곡이 <strong>${knee}°</strong>로 다리가 충분히 가슴 쪽으로 올라오지 않았습니다. 복근 및 장요근을 이용한 빠른 당기기가 필요합니다.`;
    }
  }
}

function evaluatePhase5() {
  const knee = parseFloat(document.getElementById('valKnee5').value);
  const stability = document.getElementById('valStability5').value;
  const statusKnee = document.getElementById('statusKnee5');
  const fbText     = document.getElementById('feedbackText5');

  if (!isNaN(knee)) {
    if (knee >= 135) {
      statusKnee.className = 'status-pill good';
      statusKnee.innerText = '전방 발 뻗기 우수';
    } else {
      statusKnee.className = 'status-pill warn';
      statusKnee.innerText = '조기 하강 (거리 손실)';
    }
  }

  if (stability === 'perfect') {
    fbText.innerHTML = `접지 순간 발을 전방으로 최대한 뻗었으며, 착지 직후 무게중심(COM)이 전방으로 자연스럽게 넘어가 손실 없이 기록이 인정됩니다.`;
  } else if (stability === 'fall') {
    fbText.innerHTML = `착지 시 골반이 전방으로 넘어가지 못하고 후방으로 주저앉아 큰 거리 손실이 발생했습니다. 착지 시 상체 전방 유도가 필수적입니다.`;
  }
}

// 5. 리포트 전체 데이터 JSON 내보내기
function exportDataJSON() {
  const name = document.getElementById('inputStudentName').value || '피검자';
  const reportData = {
    profile: {
      name: name,
      org: document.getElementById('inputOrg').value,
      date: document.getElementById('inputDate').value,
      score: document.getElementById('inputScore').value,
      targetScore: document.getElementById('inputTargetScore').value
    },
    phases: {
      phase1: { knee: document.getElementById('valKnee1').value, hip: document.getElementById('valHip1').value },
      phase2: { knee: document.getElementById('valKnee2').value, hip: document.getElementById('valHip2').value, trunk: document.getElementById('valTrunk2').value },
      phase3: { knee: document.getElementById('valKnee3').value, launch: document.getElementById('valLaunch3').value },
      phase4: { knee: document.getElementById('valKnee4').value, flightTime: document.getElementById('valFlightTime4').value },
      phase5: { knee: document.getElementById('valKnee5').value, stability: document.getElementById('valStability5').value }
    },
    summary: {
      strengths: document.getElementById('textStrengths').value,
      improvements: document.getElementById('textImprovements').value,
      trainingPlan: document.getElementById('inputTrainingPlan').value
    }
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
  const a = document.createElement('a');
  a.setAttribute('href', dataStr);
  a.setAttribute('download', `${name}_PASS_제자리멀리뛰기_동작분석.json`);
  document.body.appendChild(a);
  a.click();
  a.remove();
}
