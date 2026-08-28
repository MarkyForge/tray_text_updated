  const liveText = document.getElementById('liveText');
  const textBlock = document.getElementById('textBlock');
  const dragHandle = document.getElementById('dragHandle');
  const charCount = document.getElementById('charCount');
  const fontGrid = document.getElementById('fontGrid');
  const sizeRange = document.getElementById('sizeRange');
  const sizeVal = document.getElementById('sizeVal');
  const weightRange = document.getElementById('weightRange');
  const weightVal = document.getElementById('weightVal');
  const sizePresets = document.getElementById('sizePresets');
  const trackingRange = document.getElementById('trackingRange');
  const trackingVal = document.getElementById('trackingVal');
  const leadingRange = document.getElementById('leadingRange');
  const leadingVal = document.getElementById('leadingVal');
  const widthRange = document.getElementById('widthRange');
  const widthVal = document.getElementById('widthVal');
  const swatches = document.getElementById('swatches');

  const textInput = document.getElementById('textInput');
  let syncingFromPreview = false;
  let syncingFromInput = false;

  function refreshCharCount(){
    charCount.textContent = (liveText.innerText || '').length + ' chars';
  }

  // typing in the panel textarea replaces the whole tray text (resets per-word styling)
  textInput.addEventListener('input', ()=>{
    if(syncingFromPreview) return;
    syncingFromInput = true;
    liveText.textContent = textInput.value || '';
    refreshCharCount();
    syncingFromInput = false;
  });

  // editing directly on the tray keeps per-word styling, and mirrors plain text back to the textarea
  liveText.addEventListener('input', ()=>{
    if(syncingFromInput) return;
    syncingFromPreview = true;
    textInput.value = liveText.innerText;
    syncingFromPreview = false;
    refreshCharCount();
  });

  // ---- track a "saved" selection inside liveText, so clicking panel controls doesn't lose it ----
  let savedRange = null;
  document.addEventListener('selectionchange', ()=>{
    const sel = window.getSelection();
    if(sel && sel.rangeCount && !sel.isCollapsed && liveText.contains(sel.anchorNode) && liveText.contains(sel.focusNode)){
      savedRange = sel.getRangeAt(0).cloneRange();
    }
  });

  function getActiveSelectionRange(){
    const sel = window.getSelection();
    if(sel && sel.rangeCount && !sel.isCollapsed && liveText.contains(sel.anchorNode) && liveText.contains(sel.focusNode)){
      return sel.getRangeAt(0);
    }
    if(savedRange && liveText.contains(savedRange.commonAncestorContainer) && !savedRange.collapsed){
      return savedRange;
    }
    return null;
  }

  // wraps the given range's contents in a span, merging with existing inline style if present
  function wrapSelectionWithStyle(styleProp, value){
    const range = getActiveSelectionRange();
    if(!range){
      return false; // caller should fall back to a global style
    }
    const span = document.createElement('span');
    span.style[styleProp] = value;
    try{
      range.surroundContents(span);
    }catch(e){
      const frag = range.extractContents();
      span.appendChild(frag);
      range.insertNode(span);
    }
    const sel = window.getSelection();
    sel.removeAllRanges();
    savedRange = null;
    refreshCharCount();
    return true;
  }

  function preventFocusSteal(container){
    container.querySelectorAll('*').forEach(el=>{
      el.addEventListener('mousedown', (e)=> e.preventDefault());
    });
  }
  preventFocusSteal(fontGrid);
  preventFocusSteal(swatches);

  // ---- font family ----
  fontGrid.addEventListener('click', (e)=>{
    const chip = e.target.closest('.font-chip');
    if(!chip) return;
    const applied = wrapSelectionWithStyle('fontFamily', chip.dataset.font);
    if(!applied){
      [...fontGrid.children].forEach(c=>c.classList.remove('active'));
      chip.classList.add('active');
      liveText.style.fontFamily = chip.dataset.font;
    }
  });

  // ---- color ----
  swatches.addEventListener('click', (e)=>{
    const sw = e.target.closest('.swatch');
    if(!sw) return;
    const applied = wrapSelectionWithStyle('color', sw.dataset.color);
    if(!applied){
      [...swatches.children].forEach(c=>c.classList.remove('active'));
      sw.classList.add('active');
      liveText.style.color = sw.dataset.color;
    }
  });

  // ---- size / weight / tracking / leading / width: whole-block controls ----
  sizeRange.addEventListener('input', ()=>{
    liveText.style.fontSize = sizeRange.value + 'px';
    sizeVal.textContent = sizeRange.value + 'px';
    [...sizePresets.children].forEach(b=>b.classList.toggle('active', b.dataset.size === sizeRange.value));
  });

  sizePresets.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    sizeRange.value = btn.dataset.size;
    sizeRange.dispatchEvent(new Event('input'));
  });

  weightRange.addEventListener('input', ()=>{
    liveText.style.fontWeight = weightRange.value;
    weightVal.textContent = weightRange.value;
  });

  trackingRange.addEventListener('input', ()=>{
    liveText.style.letterSpacing = trackingRange.value + 'px';
    trackingVal.textContent = trackingRange.value + 'px';
  });

  leadingRange.addEventListener('input', ()=>{
    const lh = (leadingRange.value / 100).toFixed(2);
    liveText.style.lineHeight = lh;
    leadingVal.textContent = lh;
  });

  widthRange.addEventListener('input', ()=>{
    liveText.style.maxWidth = widthRange.value + '%';
    widthVal.textContent = widthRange.value + '%';
  });

  // ---- position: drag handle + nudge ----
  let offsetX = 0;
  let offsetY = 0;
  const NUDGE_STEP = 6;
  const stageEl = document.querySelector('.stage');

  function applyPosition(){
    textBlock.style.transform = `translate(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px))`;
  }

  function clampToStage(){
    const stageRect = stageEl.getBoundingClientRect();
    const maxOffX = stageRect.width * 0.6;
    const maxOffY = stageRect.height * 0.6;
    offsetX = Math.max(-maxOffX, Math.min(maxOffX, offsetX));
    offsetY = Math.max(-maxOffY, Math.min(maxOffY, offsetY));
  }

  let dragging = false;
  let startPointer = {x:0,y:0};
  let startOffset = {x:0,y:0};

  dragHandle.addEventListener('pointerdown', (e)=>{
    dragging = true;
    dragHandle.classList.add('dragging');
    dragHandle.setPointerCapture(e.pointerId);
    startPointer = {x:e.clientX, y:e.clientY};
    startOffset = {x:offsetX, y:offsetY};
    e.preventDefault();
  });

  dragHandle.addEventListener('pointermove', (e)=>{
    if(!dragging) return;
    offsetX = startOffset.x + (e.clientX - startPointer.x);
    offsetY = startOffset.y + (e.clientY - startPointer.y);
    clampToStage();
    applyPosition();
  });

  function endDrag(){
    if(!dragging) return;
    dragging = false;
    dragHandle.classList.remove('dragging');
  }
  dragHandle.addEventListener('pointerup', endDrag);
  dragHandle.addEventListener('pointercancel', endDrag);

  document.querySelectorAll('.nudge-btn[data-dx]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      offsetX += Number(btn.dataset.dx) * NUDGE_STEP * 4;
      offsetY += Number(btn.dataset.dy) * NUDGE_STEP * 4;
      clampToStage();
      applyPosition();
    });
  });

  document.getElementById('resetPos').addEventListener('click', ()=>{
    offsetX = 0;
    offsetY = 0;
    applyPosition();
  });

  // ---- background choice ----
  const bgPresets = document.getElementById('bgPresets');
  const bgLayers = document.querySelectorAll('.bg-layer');
  const bgCustom = document.getElementById('bgCustom');

  // populate the swatch thumbnails from the actual background images already in the page
  document.getElementById('thumbTexture').style.backgroundImage = `url(${document.getElementById('bgTexture').src})`;
  document.getElementById('thumbGrid').style.backgroundImage = `url(${document.getElementById('bgGrid').src})`;

  const photoZoomRange = document.getElementById('photoZoomRange');
  const photoZoomVal = document.getElementById('photoZoomVal');
  const photoZoomHint = document.getElementById('photoZoomHint');

  // zoom/pan only ever applies to the uploaded photo, not the preset backgrounds
  function getActivePhotoLayer(){
    return bgCustom.classList.contains('active') ? bgCustom : null;
  }

  bgPresets.addEventListener('click', (e)=>{
    const btn = e.target.closest('.bg-swatch');
    if(!btn) return;
    bgLayers.forEach(img=> img.classList.toggle('active', img.id === btn.dataset.bg));
    [...bgPresets.children].forEach(b=>b.classList.toggle('active', b===btn));
    syncZoomSliderToActive();
  });

  // ---- photo drag (pan) + adjustable zoom (slider, scroll wheel, pinch) ----
  const MIN_ZOOM = 0.4;
  const MAX_ZOOM = 3;
  const photoState = new Map(); // img.id -> {scale, x, y, baseW, baseH}

  function getPhotoState(img){
    if(!photoState.has(img.id)) photoState.set(img.id, {scale:1, x:0, y:0, baseW:0, baseH:0});
    return photoState.get(img.id);
  }

  // the photo's own "cover" size for the current frame — computed from its natural
  // aspect ratio, so it overflows the frame on whichever axis doesn't match, and can
  // be dragged edge-to-edge along that axis even with no extra zoom applied
  function computeBaseSize(img){
    const stageRect = stageEl.getBoundingClientRect();
    const natW = img.naturalWidth || stageRect.width;
    const natH = img.naturalHeight || stageRect.height;
    const coverScale = Math.max(stageRect.width / natW, stageRect.height / natH);
    return { w: natW * coverScale, h: natH * coverScale };
  }

  function refreshBaseSize(img){
    const state = getPhotoState(img);
    const size = computeBaseSize(img);
    state.baseW = size.w;
    state.baseH = size.h;
  }

  function resetPhotoState(img){
    const size = computeBaseSize(img);
    photoState.set(img.id, {scale:1, x:0, y:0, baseW:size.w, baseH:size.h});
    applyPhotoTransform(img);
  }

  function clampPhotoState(state){
    const stageRect = stageEl.getBoundingClientRect();
    const renderedW = state.baseW * state.scale;
    const renderedH = state.baseH * state.scale;
    // when the photo is bigger than the frame, this keeps it covering edge-to-edge
    // with no gaps; when it's smaller (zoomed out), this instead lets it slide freely
    // from touching one edge of the frame to touching the opposite edge
    const maxX = Math.abs(renderedW - stageRect.width) / 2;
    const maxY = Math.abs(renderedH - stageRect.height) / 2;
    state.x = Math.max(-maxX, Math.min(maxX, state.x));
    state.y = Math.max(-maxY, Math.min(maxY, state.y));
  }

  function applyPhotoTransform(img){
    const state = getPhotoState(img);
    img.style.width = state.baseW + 'px';
    img.style.height = state.baseH + 'px';
    img.style.transform = `translate(-50%, -50%) translate(${state.x}px, ${state.y}px) scale(${state.scale})`;
    img.classList.toggle('zoomed', state.scale > 1);
  }

  function setPhotoZoom(img, newScale){
    const state = getPhotoState(img);
    state.scale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));
    clampPhotoState(state);
    applyPhotoTransform(img);
  }

  function syncZoomSliderToActive(){
    const img = getActivePhotoLayer();
    if(!img){
      photoZoomRange.disabled = true;
      photoZoomRange.value = 100;
      photoZoomVal.textContent = '100%';
      photoZoomHint.textContent = 'Upload your own photo to zoom and reposition it — drag the photo itself once zoomed in.';
      return;
    }
    photoZoomRange.disabled = false;
    photoZoomHint.textContent = 'Drag the photo to reposition it edge-to-edge, or scroll/pinch/use the slider to zoom.';
    const state = getPhotoState(img);
    const pct = Math.round(state.scale * 100);
    photoZoomRange.value = pct;
    photoZoomVal.textContent = pct + '%';
  }

  // slider: precise, adjustable zoom control
  photoZoomRange.addEventListener('input', ()=>{
    const img = getActivePhotoLayer();
    if(!img) return;
    const scale = Number(photoZoomRange.value) / 100;
    setPhotoZoom(img, scale);
    photoZoomVal.textContent = Math.round(getPhotoState(img).scale * 100) + '%';
  });

  let photoDragging = false;
  let photoDragImg = null;
  let photoStartPointer = {x:0,y:0};
  let photoStartOffset = {x:0,y:0};
  let lastTapTime = 0;
  const activePointers = new Map(); // pointerId -> {x,y}, for pinch-to-zoom
  let pinchStartDist = 0;
  let pinchStartScale = 1;

  function pointersDistance(){
    const pts = [...activePointers.values()];
    if(pts.length < 2) return 0;
    return Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y);
  }

  (function setupPhotoInteractions(img){
    // mouse / trackpad scroll wheel to zoom, centered on cursor position
    img.addEventListener('wheel', (e)=>{
      if(!img.classList.contains('active')) return;
      e.preventDefault();
      const state = getPhotoState(img);
      const delta = -e.deltaY * 0.0025;
      setPhotoZoom(img, state.scale + delta);
      syncZoomSliderToActive();
    }, {passive:false});

    img.addEventListener('pointerdown', (e)=>{
      if(!img.classList.contains('active')) return;
      activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});
      img.setPointerCapture(e.pointerId);

      if(activePointers.size === 2){
        // second finger down — switch to pinch-to-zoom mode
        photoDragging = false;
        pinchStartDist = pointersDistance();
        pinchStartScale = getPhotoState(img).scale;
        return;
      }

      photoDragging = true;
      photoDragImg = img;
      photoStartPointer = {x:e.clientX, y:e.clientY};
      const state = getPhotoState(img);
      photoStartOffset = {x:state.x, y:state.y};
      img.classList.add('dragging');
      e.preventDefault();
    });

    img.addEventListener('pointermove', (e)=>{
      if(!activePointers.has(e.pointerId)) return;
      activePointers.set(e.pointerId, {x:e.clientX, y:e.clientY});

      if(activePointers.size === 2){
        const dist = pointersDistance();
        if(pinchStartDist > 0){
          const scale = pinchStartScale * (dist / pinchStartDist);
          setPhotoZoom(img, scale);
          syncZoomSliderToActive();
        }
        return;
      }

      if(!photoDragging || photoDragImg !== img) return;
      const dx = e.clientX - photoStartPointer.x;
      const dy = e.clientY - photoStartPointer.y;
      const state = getPhotoState(img);
      state.x = photoStartOffset.x + dx;
      state.y = photoStartOffset.y + dy;
      clampPhotoState(state);
      applyPhotoTransform(img);
    });

    function endPhotoDrag(e){
      const wasSingleTap = photoDragging && photoDragImg === img
        && Math.abs(e.clientX - photoStartPointer.x) < 6
        && Math.abs(e.clientY - photoStartPointer.y) < 6;

      activePointers.delete(e.pointerId);
      if(activePointers.size < 2) pinchStartDist = 0;

      if(photoDragImg === img && activePointers.size === 0){
        photoDragging = false;
        img.classList.remove('dragging');
        photoDragImg = null;
      }

      if(wasSingleTap){
        const now = Date.now();
        if(now - lastTapTime < 350){
          // double tap / double click — reset zoom and position
          resetPhotoState(img);
          syncZoomSliderToActive();
          lastTapTime = 0;
        }else{
          lastTapTime = now;
        }
      }
    }
    img.addEventListener('pointerup', endPhotoDrag);
    img.addEventListener('pointercancel', endPhotoDrag);
  })(bgCustom);

  // ---- upload your own photo as the background ----
  const uploadBtn = document.getElementById('uploadBtn');
  const uploadInput = document.getElementById('uploadInput');

  uploadBtn.addEventListener('click', ()=> uploadInput.click());

  uploadInput.addEventListener('change', ()=>{
    const file = uploadInput.files && uploadInput.files[0];
    if(!file) return;
    const reader = new FileReader();
    reader.onload = (e)=>{
      bgCustom.onload = ()=>{
        resetPhotoState(bgCustom);
        syncZoomSliderToActive();
      };
      bgCustom.src = e.target.result;
      bgLayers.forEach(img=> img.classList.toggle('active', img === bgCustom));
      [...bgPresets.children].forEach(b=> b.classList.remove('active'));
    };
    reader.readAsDataURL(file);
    uploadInput.value = '';
  });

  // ---- composition size (aspect ratio) ----
  const ratioPresets = document.getElementById('ratioPresets');
  ratioPresets.addEventListener('click', (e)=>{
    const btn = e.target.closest('button');
    if(!btn) return;
    stageEl.style.aspectRatio = btn.dataset.ratio;
    [...ratioPresets.children].forEach(b=>b.classList.toggle('active', b===btn));
    clampToStage();
    applyPosition();
    requestAnimationFrame(()=>{
      if(bgCustom.classList.contains('active') && bgCustom.naturalWidth){
        refreshBaseSize(bgCustom);
        clampPhotoState(getPhotoState(bgCustom));
        applyPhotoTransform(bgCustom);
      }
    });
  });

  // ---- download ----
  const downloadBtn = document.getElementById('downloadBtn');
  const downloadLabel = document.getElementById('downloadLabel');

  downloadBtn.addEventListener('click', async ()=>{
    downloadBtn.disabled = true;
    downloadLabel.textContent = 'Preparing…';
    dragHandle.style.visibility = 'hidden';
    try{
      if (document.fonts && document.fonts.ready) { await document.fonts.ready; }
      const canvas = await html2canvas(stageEl, {
        backgroundColor: '#f7f5ef',
        scale: 3,
        useCORS: true
      });
      const link = document.createElement('a');
      link.download = 'tray-announcement.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }catch(err){
      console.error(err);
      downloadLabel.textContent = 'Failed — try again';
      setTimeout(()=>{ downloadLabel.textContent = 'Download image'; }, 1800);
      downloadBtn.disabled = false;
      dragHandle.style.visibility = '';
      return;
    }
    downloadLabel.textContent = 'Download image';
    downloadBtn.disabled = false;
    dragHandle.style.visibility = '';
  });

  // ---- init ----
  liveText.style.fontFamily = "'Playfair Display', serif";
  liveText.style.fontWeight = "700";
  liveText.style.fontStyle = "italic";
  liveText.style.fontSize = "34px";
  liveText.style.color = "#141414";
  liveText.style.letterSpacing = "0px";
  liveText.style.lineHeight = "1.05";
  liveText.style.maxWidth = "78%";
  document.querySelector('.size-presets button[data-size="34"]').classList.add('active');
  applyPosition();
  textInput.value = liveText.innerText;
  refreshCharCount();
  syncZoomSliderToActive();