/* ============================================================
   자료집 · 미션 탭 렌더링
   - 데이터는 booklet-data.js (window.BOOKLET)
   - 주소 규칙
       #booklet            자료집 첫 화면 (장소 목록 + 공통 안내)
       #place/haenyeo      장소 페이지 (미션 카드 QR은 이 주소로)
       #place/haenyeo/2    장소 페이지에서 두 번째 미션으로 스크롤
   ============================================================ */
(function () {
  const B = window.BOOKLET;
  const $ = (sel, root) => (root || document).querySelector(sel);
  const esc = (v) => String(v == null ? '' : v)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

  /* ---------- 내 정보 (학번·이름) — 이 휴대폰에만 저장 ---------- */
  const ME_KEY = 'jeju2026.me';
  function loadMe() {
    try { return JSON.parse(localStorage.getItem(ME_KEY) || '{}'); } catch (e) { return {}; }
  }
  function saveMe(me) {
    try { localStorage.setItem(ME_KEY, JSON.stringify(me)); } catch (e) { /* 저장 불가 환경이면 무시 */ }
  }

  /* ---------- 임시 메모 (미션별 초안) ---------- */
  function draftKey(placeId, idx) { return 'jeju2026.draft.' + placeId + '.' + idx; }
  function loadDraft(placeId, idx) {
    try { return localStorage.getItem(draftKey(placeId, idx)) || ''; } catch (e) { return ''; }
  }
  function saveDraft(placeId, idx, text) {
    try { localStorage.setItem(draftKey(placeId, idx), text); } catch (e) { /* 무시 */ }
  }

  /* ---------- Google Form 사전 입력 링크 ---------- */
  function formUrlFor(place) {
    return (B.form && B.form.urls && B.form.urls[place.course]) || '';
  }
  function formReady(place) { return !!formUrlFor(place); }
  function buildFormUrl(place, mission) {
    const base = formUrlFor(place);
    if (!base) return '';
    const me = loadMe();
    const e = B.form.entries || {};
    const params = [];
    const add = (key, val) => { if (key && val) params.push(key + '=' + encodeURIComponent(val)); };
    add(e.studentLine, [me.id, me.name].filter(Boolean).join(' '));
    add(e.place, place.formPlace || place.name);
    add(e.points, mission.points + '점');
    return base.replace(/\?.*$/, '') + '?usp=pp_url' + (params.length ? '&' + params.join('&') : '');
  }

  /* ---------- 라우팅 ---------- */
  function parseHash() {
    const h = (location.hash || '').replace(/^#/, '');
    const m = h.match(/^place\/([a-z0-9-]+)(?:\/(\d+))?$/i);
    if (m) return { view: 'place', id: m[1], mission: m[2] ? parseInt(m[2], 10) : 0 };
    if (h === 'booklet') return { view: 'list' };
    return null;
  }
  function activateBookletTab() {
    const btn = $('#nav-booklet');
    if (btn && !btn.classList.contains('active') && typeof window.switchTab === 'function') {
      window.switchTab('booklet', btn);
    }
  }
  function route() {
    const r = parseHash();
    if (!r) return;
    activateBookletTab();
    if (r.view === 'place') renderPlace(r.id, r.mission);
    else renderList();
    window.scrollTo({ top: 0, behavior: 'auto' });
  }

  /* ---------- 목록 화면 ---------- */
  function placeCard(p) {
    const c = B.courses[p.course];
    const pts = p.missions.map(m => m.points).join(' · ');
    const thumb = p.image
      ? `<img class="bk-card-img" src="${esc(p.image)}" alt="" loading="lazy">`
      : `<div class="bk-card-img bk-card-noimg"><span>📷</span></div>`;
    return `
      <a class="bk-card" href="#place/${p.id}">
        ${thumb}
        <div class="bk-card-body">
          <div class="bk-card-top"><span class="course-tag ${c.tag}">${esc(c.name)} ${p.order}</span><span class="bk-card-pts">${esc(pts)}점</span></div>
          <div class="bk-card-name">${esc(p.name)}</div>
          <div class="bk-card-cap">${esc(p.caption)}</div>
        </div>
        <span class="bk-card-arrow">›</span>
      </a>`;
  }

  function renderList() {
    const root = $('#booklet-root');
    if (!root) return;
    const me = loadMe();
    const courseKeys = ['h', 's', 'a'];
    let html = `
      <div class="section-title">자료집 · 미션</div>

      <div class="team-lead bk-me">
        <div class="team-lead-title">내 정보 <span class="bk-me-sub">한 번만 적어 두면 제출 화면의 '학번과 이름'이 자동으로 채워집니다 · 이 휴대폰에만 저장</span></div>
        <form class="my-team-form bk-me-form" id="bk-me-form">
          <input id="bk-me-id" inputmode="numeric" pattern="\\d{5}" maxlength="5" placeholder="학번 (예: 20315)" value="${esc(me.id || '')}" aria-label="학번">
          <input id="bk-me-name" maxlength="10" placeholder="이름" value="${esc(me.name || '')}" aria-label="이름">
          <button type="submit">저장</button>
        </form>
        <div id="bk-me-status" class="my-team-result" aria-live="polite"></div>
      </div>

      <div class="bk-course-filter" role="tablist">
        <button class="bk-filter active" data-course="all">전체</button>
        ${courseKeys.map(k => `<button class="bk-filter" data-course="${k}">${esc(B.courses[k].name)}</button>`).join('')}
      </div>`;

    html += `<div class="bk-day-label">2일차 · 10월 15일 (목) · 코스별 미션</div>`;
    courseKeys.forEach(k => {
      const c = B.courses[k];
      const list = B.places.filter(p => p.course === k).sort((a, b) => a.order - b.order);
      html += `
        <div class="bk-course-group" data-course="${k}">
          <div class="bk-course-head"><span class="course-tag ${c.tag}">${esc(c.team)} · ${esc(c.name)}</span><span class="bk-course-meta">${c.places}곳 · ${esc(c.points)} · 만점 ${c.max}점</span></div>
          <div class="bk-card-list">${list.map(placeCard).join('')}</div>
        </div>`;
    });

    html += `<div class="bk-day-label">3일차 · 10월 16일 (금) · 미션 없음</div>
      <div class="bk-day3">
        ${B.day3.map(d => `<div class="bk-day3-item"><strong>${esc(d.name)}</strong><span>${d.todo && d.todo.length ? esc(d.todo.join(' · ')) : "'여기서 해볼 것' 준비 중"}</span></div>`).join('')}
      </div>`;

    html += `<div class="bk-day-label">공통 안내</div>
      <div class="bk-common">
        ${B.common.map(s => `
          <details class="team-class bk-acc" id="acc-${s.id}">
            <summary><span>${s.icon} ${esc(s.title)}</span></summary>
            <div class="bk-acc-body">${s.html}</div>
          </details>`).join('')}
      </div>
      <div class="privacy-note">이 자료집은 수학여행 지원단이 만들었습니다. 내용 문의는 지원단이나 담임 선생님께.</div>`;

    root.innerHTML = html;

    /* 내 정보 저장 */
    $('#bk-me-form').addEventListener('submit', (ev) => {
      ev.preventDefault();
      const me = {
        id: $('#bk-me-id').value.trim(),
        name: $('#bk-me-name').value.trim()
      };
      saveMe(me);
      const st = $('#bk-me-status');
      st.textContent = me.id || me.name ? '저장했습니다. [제출하기]를 누르면 자동으로 채워집니다.' : '비워 두었습니다.';
      st.classList.add('show');
    });

    /* 코스 필터 */
    root.querySelectorAll('.bk-filter').forEach(btn => {
      btn.addEventListener('click', () => {
        root.querySelectorAll('.bk-filter').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const k = btn.dataset.course;
        root.querySelectorAll('.bk-course-group').forEach(g => {
          g.style.display = (k === 'all' || g.dataset.course === k) ? '' : 'none';
        });
      });
    });
  }

  /* ---------- 장소 화면 ---------- */
  function missionCard(p, m, idx) {
    const d = B.difficulty[idx] || {};
    const url = buildFormUrl(p, m);
    const draft = loadDraft(p.id, idx);
    const submitBtn = url
      ? `<a class="apply-btn bk-submit" href="${esc(url)}" target="_blank" rel="noopener">제출하기 · ${m.points}점</a>`
      : `<button class="apply-btn bk-submit bk-submit-off" type="button" disabled>제출 링크 준비 중 · 미션 카드 QR로 제출</button>`;
    return `
      <div class="bk-mission" id="mission-${idx + 1}">
        <div class="bk-mission-head">
          <span class="bk-pts">${m.points}점</span>
          <span class="bk-diff">${esc(d.label || '')}</span>
          ${m.video ? '<span class="bk-video">영상 · 숙소에서 제출</span>' : ''}
        </div>
        <p class="bk-mission-text">${esc(m.text)}</p>
        <div class="bk-mission-submit">제출: ${esc(m.submit)}</div>
        <details class="bk-draft">
          <summary>✏️ 미리 써 두기 <span>(이 휴대폰에만 저장 · 제출할 때 복사해서 붙여 넣기)</span></summary>
          <textarea rows="4" data-place="${p.id}" data-idx="${idx}" placeholder="여기에 써 두면 지워지지 않습니다.">${esc(draft)}</textarea>
          <div class="bk-draft-tools"><span class="bk-count">${draft.length}자</span><button type="button" class="bk-copy" data-idx="${idx}">복사</button></div>
        </details>
        ${submitBtn}
      </div>`;
  }

  function renderPlace(id, missionNo) {
    const root = $('#booklet-root');
    if (!root) return;
    const p = B.places.find(x => x.id === id);
    if (!p) { location.hash = 'booklet'; return; }
    const c = B.courses[p.course];
    const siblings = B.places.filter(x => x.course === p.course).sort((a, b) => a.order - b.order);
    const i = siblings.findIndex(x => x.id === p.id);
    const prev = siblings[i - 1], next = siblings[i + 1];

    const hero = p.image
      ? `<figure class="bk-hero"><img src="${esc(p.image)}" alt="${esc(p.name)}">${p.imageCredit ? `<figcaption>${esc(p.imageCredit)}</figcaption>` : ''}</figure>`
      : `<div class="bk-hero bk-hero-empty"><span>📷</span><span>여행 후 우리가 찍은 사진으로 채웁니다</span></div>`;

    root.innerHTML = `
      <div class="bk-back"><a href="#booklet">‹ 자료집 목록</a><span class="course-tag ${c.tag}">${esc(c.team)} · ${esc(c.name)} ${p.order}/${c.places}</span></div>
      <h2 class="bk-place-name">${esc(p.name)}</h2>
      <p class="bk-place-cap">${esc(p.caption)}</p>
      ${hero}

      <div class="bk-sec"><h3>왜 여기?</h3><p>${esc(p.why)}</p></div>
      ${p.know ? `<div class="bk-sec"><h3>알아두면 좋은 것</h3><p>${esc(p.know)}</p></div>` : ''}
      <div class="bk-sec"><h3>꼭 봐야 하는 것</h3><ul class="bk-list">${p.mustSee.map(s => `<li>${esc(s)}</li>`).join('')}</ul></div>
      ${p.caution ? `<div class="bk-sec bk-caution"><h3>유의사항</h3><p>${esc(p.caution)}</p></div>` : ''}
      ${p.source ? `<div class="bk-source">출처: ${esc(p.source)}</div>` : ''}

      <div class="bk-sec"><h3>미션 <span class="bk-sec-sub">개인 참가 · 하나 끝낼 때마다 한 번씩 제출</span></h3>
        ${p.missions.map((m, idx) => missionCard(p, m, idx)).join('')}
      </div>

      <div class="bk-pn">
        ${prev ? `<a href="#place/${prev.id}">‹ ${esc(prev.name)}</a>` : '<span></span>'}
        ${next ? `<a href="#place/${next.id}">${esc(next.name)} ›</a>` : '<span></span>'}
      </div>
      <div class="privacy-note">${formReady(p) ? '제출 화면은 구글 로그인이 필요합니다. 로그인이 안 되면 지원단이나 선생님께 바로 말하세요.' : '제출 링크가 연결되면 [제출하기] 버튼이 열립니다. 그 전에는 미션 카드(종이) 뒷면 QR로 제출합니다.'}</div>`;

    /* 초안 저장 · 글자 수 · 복사 */
    root.querySelectorAll('.bk-draft textarea').forEach(ta => {
      ta.addEventListener('input', () => {
        saveDraft(ta.dataset.place, ta.dataset.idx, ta.value);
        const cnt = ta.parentElement.querySelector('.bk-count');
        if (cnt) cnt.textContent = ta.value.length + '자';
      });
    });
    root.querySelectorAll('.bk-copy').forEach(btn => {
      btn.addEventListener('click', async () => {
        const ta = btn.closest('.bk-draft').querySelector('textarea');
        try { await navigator.clipboard.writeText(ta.value); btn.textContent = '복사됨'; }
        catch (e) { ta.select(); btn.textContent = '길게 눌러 복사'; }
        setTimeout(() => { btn.textContent = '복사'; }, 1500);
      });
    });

    if (missionNo) {
      const el = $('#mission-' + missionNo);
      if (el) setTimeout(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    }
  }

  /* ---------- 시작 ---------- */
  window.addEventListener('hashchange', route);
  document.addEventListener('DOMContentLoaded', () => {
    renderList();
    route();
  });
  /* 탭 버튼으로 들어왔을 때 목록이 비어 있지 않도록 */
  window.bookletShowList = function () {
    if (location.hash && location.hash !== '#booklet') history.replaceState(null, '', '#booklet');
    renderList();
  };
})();
