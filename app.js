// PASS 제자리멀리뛰기 웹 리포트 인터랙션 스크립트

const videoInput = document.getElementById('videoInput');
const jumpVideo = document.getElementById('jumpVideo');
const playerWrapper = document.getElementById('playerWrapper');
const dropZone = document.getElementById('dropZone');

// 국면별 기준 타임스탬프 (기본값)
const phaseTimestamps = {
  1: 0.00,  // 준비
  2: 0.58,  // 최대 굴곡
  3: 0.92,  // 이륙
  4: 1.25,  // 체공
  5: 1.50   // 착지
};

// 비디오 파일 업로드 처리
videoInput.addEventListener('change', function(e) {
  const file = e.target.files[0];
  if (file) {
    loadVideoFile(file);
  }
});

// 드래그 앤 드롭 지원
dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#58a6ff';
});

dropZone.addEventListener('dragleave', () => {
  dropZone.style.borderColor = '#30363d';
});

dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.style.borderColor = '#30363d';
  if (e.dataTransfer.files.length > 0) {
    loadVideoFile(e.dataTransfer.files[0]);
  }
});

function loadVideoFile(file) {
  const fileUrl = URL.createObjectURL(file);
  jumpVideo.src = fileUrl;
  playerWrapper.style.display = 'flex';
  dropZone.innerHTML = `<span style="color:#39d353; font-weight:700;">✓ 영상 로드 완료: ${file.name}</span><button class="btn btn-secondary" style="margin-top:8px; padding:4px 12px; font-size:12px;" onclick="document.getElementById('videoInput').click()">다른 영상으로 변경</button>`;
}

// 특정 국면으로 비디오 시간 이동
function seekToPhase(phaseNum) {
  if (!jumpVideo.src) {
    alert('먼저 분석 완료된 MP4 영상을 업로드해주세요.');
    return;
  }
  jumpVideo.currentTime = phaseTimestamps[phaseNum];
  jumpVideo.pause();
}

// 현재 영상 프레임 캡처 함수
function captureCurrentFrame() {
  if (!jumpVideo.src) {
    alert('영상이 로드되지 않았습니다.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = jumpVideo.videoWidth || 640;
  canvas.height = jumpVideo.videoHeight || 360;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(jumpVideo, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg');
  
  const phaseChoice = prompt('현재 장면을 적용할 국면 번호를 입력하세요 (1: 준비, 2: 최대굴곡, 3: 이륙, 4: 체공, 5: 착지):', '2');
  if (phaseChoice && phaseTimestamps[phaseChoice]) {
    const targetImg = document.getElementById(`imgP${phaseChoice}`);
    if (targetImg) {
      targetImg.src = dataUrl;
      const timeLabel = document.getElementById(`timeP${phaseChoice}`);
      if (timeLabel) {
        timeLabel.innerText = `${jumpVideo.currentTime.toFixed(2)}s`;
      }
      alert(`국면 ${phaseChoice} 사진이 현재 영상 프레임으로 교체되었습니다!`);
    }
  }
}

// 각 국면 카드 내 '이 사진으로 교체' 버튼 동작
function replacePhaseImage(phaseNum) {
  if (!jumpVideo.src) {
    alert('상단에서 영상을 먼저 업로드한 뒤, 원하는 지점으로 이동 후 교체 버튼을 눌러주세요.');
    return;
  }

  const canvas = document.createElement('canvas');
  canvas.width = jumpVideo.videoWidth || 640;
  canvas.height = jumpVideo.videoHeight || 360;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(jumpVideo, 0, 0, canvas.width, canvas.height);

  const dataUrl = canvas.toDataURL('image/jpeg');
  const targetImg = document.getElementById(`imgP${phaseNum}`);
  if (targetImg) {
    targetImg.src = dataUrl;
    const timeLabel = document.getElementById(`timeP${phaseNum}`);
    if (timeLabel) {
      timeLabel.innerText = `${jumpVideo.currentTime.toFixed(2)}s`;
    }
    alert(`국면 ${phaseNum} 사진이 현재 비디오 화면으로 업데이트되었습니다!`);
  }
}

// 리포트 데이터 로컬 저장
function exportReportData() {
  const reportData = {
    name: document.getElementById('studentName').innerText,
    center: '패스체대입시 연수송도센터',
    distance: document.getElementById('jumpDistance').innerText,
    minKneeAngle: document.getElementById('angP2Knee').innerText,
    takeoffKneeAngle: document.getElementById('angP3Knee').innerText,
    date: new Date().toISOString().split('T')[0]
  };

  const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(reportData, null, 2));
  const downloadAnchor = document.createElement('a');
  downloadAnchor.setAttribute('href', dataStr);
  downloadAnchor.setAttribute('download', `${reportData.name}_PASS_제멀_동작분석리포트.json`);
  document.body.appendChild(downloadAnchor);
  downloadAnchor.click();
  downloadAnchor.remove();
}
