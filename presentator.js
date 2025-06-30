const DATA_PATH = 'punten.json';

let data;
let slides = [];
let currentSlide = 0;

function sorteerPunten(punten) {
  return Object.entries(punten)
    .filter(([school, punten]) => punten > 0)
    .sort((a, b) => b[1] - a[1]);
}

function berekenTussenstand(juryArray, totIndex, televote = null) {
  const totaal = {};
  juryArray.forEach(j => Object.keys(j.punten).forEach(s => (totaal[s] = 0)));
  juryArray.slice(0, totIndex).forEach(j => {
    Object.entries(j.punten).forEach(([school, punten]) => {
      totaal[school] += punten;
    });
  });
  if (televote) Object.entries(televote).forEach(([s, p]) => (totaal[s] += p));
  return Object.entries(totaal).sort((a, b) => b[1] - a[1]);
}

function ranglabel(n) {
  if (n === 1) return '🥇';
  if (n === 2) return '🥈';
  if (n === 3) return '🥉';
  return `${n}e`;
}

function maakJurySlides(juryArray) {
  const total = juryArray.length;
  const half = Math.floor(total / 2);
  juryArray.forEach((jury, i) => {
    slides.push({
      type: 'jury-intro',
      juryIndex: i,
      school: jury.school,
      presentator: jury.presentator,
      juryNummer: i + 1,
      juryTotal: total,
      allJuryNamen: juryArray.map(j => j.school),
    });
    slides.push({
      type: 'jury-punten',
      juryIndex: i,
      punten: sorteerPunten(jury.punten)
    });
    let reminder = false;
    if (i + 1 === half || i + 1 === total) reminder = true;
    slides.push({
      type: 'tussenstand',
      totJury: i + 1,
      reminder
    });
  });
}

function maakTelevoteSlides(televote, juryArray) {
  let tussenstand = berekenTussenstand(juryArray, juryArray.length);
  const scholenVolgorde = tussenstand
    .slice()
    .sort((a, b) => a[1] - b[1])
    .map(([school]) => school);

  slides.push({
    type: 'televote-begin',
    totaalScholen: scholenVolgorde.length
  });

  scholenVolgorde.forEach((school, idx) => {
    const huidig = tussenstand.find(([s]) => s === school)[1];
    const hoogste = Math.max(...tussenstand.map(([, p]) => p));
    const verschil = Math.max(0, hoogste - huidig + 1);

    const ontvangenTelevoteVoor = Object.fromEntries(
      scholenVolgorde.slice(0, idx).map(s => [s, televote[s]])
    );
    const ontvangenTelevoteNa = Object.fromEntries(
      scholenVolgorde.slice(0, idx + 1).map(s => [s, televote[s]])
    );

    const nogTeGaan = scholenVolgorde.length - idx;

    slides.push({
      type: 'televote-voor',
      school,
      huidig,
      verschil,
      schoolNummer: idx + 1,
      schoolTotal: scholenVolgorde.length,
      nogTeGaan,
      volgorde: scholenVolgorde,
      ontvangenTelevote: ontvangenTelevoteVoor
    });

    const nieuw = huidig + televote[school];
    slides.push({
      type: 'televote-na',
      school,
      nieuw,
      televote: televote[school],
      schoolNummer: idx + 1,
      schoolTotal: scholenVolgorde.length,
      volgorde: scholenVolgorde,
      ontvangenTelevote: ontvangenTelevoteNa
    });

    tussenstand = tussenstand.map(([s, p]) => [s, s === school ? nieuw : p]);
    slides.push({
      type: 'tussenstand',
      totJury: juryArray.length,
      televote: Object.fromEntries(scholenVolgorde.slice(0, idx + 1).map(s => [s, televote[s]])),
      reminder: false
    });
  });
}

function renderJuryProgress(juryIndex, total, names) {
  return `<div style="display:flex;justify-content:center;flex-wrap:wrap;font-size:0.8em;gap:0.15em;max-width:98vw;margin:0.2em 0 0.4em 0;">
    ${names.map((naam, i) =>
      `<span style="padding:0.18em 0.56em;border-radius:0.75em;${i < juryIndex ? "background:#15e88f;color:#222;" : i === juryIndex ? "background:#fff;color:#222;font-weight:bold;" : "background:#fff3;color:#ccc;"}">
        ${naam}${i < juryIndex ? ' ✓' : ''}
      </span>`
    ).join('')}
  </div>`;
}

function renderTelevoteScoreboard(volgorde, juryArray, toegekendeTelevote, huidigeSchool, highlightIsNa) {
  let totaal = {};
  juryArray.forEach(j => Object.keys(j.punten).forEach(s => (totaal[s] = 0)));
  juryArray.forEach(j =>
    Object.entries(j.punten).forEach(([school, punten]) => { totaal[school] += punten; })
  );
  Object.entries(toegekendeTelevote).forEach(([school, punten]) => { totaal[school] += punten; });

  let scholen = Object.keys(totaal).map(school => [
    school,
    totaal[school],
    toegekendeTelevote[school] || 0
  ]);
  scholen.sort((a, b) => b[1] - a[1]);

  let rangMap = {};
  let lastScore = null, lastRank = 0;
  scholen.forEach(([school, punten], idx) => {
    if (punten !== lastScore) lastRank = idx + 1;
    rangMap[school] = lastRank;
    lastScore = punten;
  });

  return `
    <div style="display:flex;justify-content:center;width:100%;margin-top:0.6em;margin-bottom:0.3em;">
      <div style="background:rgba(0,0,0,0.16);border-radius:0.6em;padding:0.54em 1.1em 0.7em 1.1em;box-shadow:0 2px 8px #0002; font-size:1em;max-width:480px;width:100%;">
        <div style="font-size:1em;font-weight:bold;margin-bottom:0.13em;text-align:center;">Scoreboard</div>
        <table style="width:100%;border-collapse:collapse;font-size:0.97em;">
          <thead>
            <tr>
              <th style="text-align:left;font-weight:600;font-size:0.93em;">&nbsp;</th>
              <th style="text-align:left;font-weight:600;font-size:0.93em;">School</th>
              <th style="text-align:right;font-weight:600;font-size:0.93em;">Totaal</th>
              <th style="text-align:right;font-weight:600;font-size:0.93em;">TV</th>
            </tr>
          </thead>
          <tbody>
            ${scholen.map(([school, totaalScore, tvPunten]) => {
              const rank = rangMap[school];
              const kleur = school === huidigeSchool && highlightIsNa
                ? 'background:#ffe066;color:#752;font-weight:bold;'
                : school === huidigeSchool
                ? 'background:#d1f7c4;color:#1b4;font-weight:bold;'
                : tvPunten > 0
                ? 'background:#baffd6;color:#194;'
                : '';
              return `<tr style="${kleur}border-radius:0.4em;">
                <td style="width:1.5em;text-align:right;padding:0 0.25em 0 0.1em;">${ranglabel(rank)}</td>
                <td style="text-align:left;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 0.2em;">${school}</td>
                <td style="text-align:right;padding:0 0.2em;">${totaalScore}</td>
                <td style="text-align:right;padding:0 0.2em;">
                  ${tvPunten > 0 ? `<span style="color:#090; font-weight:600;">+${tvPunten}</span>` : ''}
                </td>
              </tr>`;
            }).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderSlide(slide) {
  const el = document.getElementById('slideshow');
  el.innerHTML = '';
  const slideDiv = document.createElement('div');
  slideDiv.className = 'slide active';

  // --- Toevoeging: gelijkstand melding bij televote-voor en televote-na ---
  let gelijkTekst = '';
  if (slide.type === 'televote-voor' || slide.type === 'televote-na') {
    // Bepaal huidige jury+televote tussenstand op dit moment
    const juryArray = data.jury;
    const toegekendeTelevote = slide.ontvangenTelevote || {};
    let totaal = {};
    juryArray.forEach(j => Object.keys(j.punten).forEach(s => (totaal[s] = 0)));
    juryArray.forEach(j =>
      Object.entries(j.punten).forEach(([school, punten]) => { totaal[school] += punten; })
    );
    Object.entries(toegekendeTelevote).forEach(([school, punten]) => { totaal[school] += punten; });

    const puntenVanSchool = totaal[slide.school];
    const gelijkMet = Object.keys(totaal)
      .filter(s => s !== slide.school && totaal[s] === puntenVanSchool);

    if (gelijkMet.length) {
      gelijkTekst = `<div style="color:#ffd900;font-size:0.95em;margin:0.5em 0;">
        ⚠️ <b>${slide.school}</b> heeft op dit moment evenveel punten als: <b>${gelijkMet.join(', ')}</b>
      </div>`;
    }
  }
  // --- Einde toevoeging gelijkstand ---

  let scoreboard = '';

  if (slide.type === 'jury-intro') {
    const p = slide.presentator;
    slideDiv.innerHTML = `
      <div style="font-size:0.97em;margin-bottom:0.2em;">Vakjury ${slide.juryNummer} van ${slide.juryTotal}</div>
      ${renderJuryProgress(slide.juryIndex, slide.juryTotal, slide.allJuryNamen)}
      <h2>Volgende vakjury: ${slide.school}</h2>
      <h3>${p.naam}</h3>
      <p>${p.bio}</p>
    `;
  }
  if (slide.type === 'jury-punten') {
    slideDiv.innerHTML = `
      <h2>Punten van de jury</h2>
      <ul>
        ${slide.punten.map(([school, punten]) =>
          `<li><span class="school">${school}</span><span class="punten">${punten}</span></li>`
        ).join('')}
      </ul>
    `;
  }
  if (slide.type === 'tussenstand') {
    let tussenstand;
    if (slide.televote) {
      tussenstand = berekenTussenstand(
        data.jury,
        data.jury.length,
        slide.televote
      );
    } else {
      tussenstand = berekenTussenstand(data.jury, slide.totJury);
    }
    slideDiv.innerHTML = `
      <h2>Tussenstand</h2>
      <ol>
        ${tussenstand.map(([school, punten], idx) =>
          `<li><span class="rang">${ranglabel(idx+1)}</span><span class="school">${school}</span><span class="punten">${punten}</span></li>`
        ).join('')}
      </ol>
      ${
        slide.reminder
          ? `<p style="font-size:0.84em;margin-top:0.8em;color:#00ffd9;">
              Presentator: bespreek deze tussenstand ook even met het publiek en neem de tijd om naar de greenroom te schakelen!
            </p>`
          : ''
      }
    `;
  }
  if (slide.type === 'televote-begin') {
    slideDiv.innerHTML = `
      <h2>Start van de televotes!</h2>
      <p style="font-size:1.1em;margin-top:1em;">
        De punten van het publiek worden nu bekendgemaakt.<br>
        <br>
        Er zijn <b>${slide.totaalScholen}</b> scholen die publiekspunten ontvangen.<br>
        <br>
        <span style="color: #00ffd9;">Presentator: kondig aan dat we nu de publieksstemmen gaan verdelen!</span>
      </p>
    `;
  }
  if (slide.type === 'televote-voor' || slide.type === 'televote-na') {
    const highlightIsNa = slide.type === 'televote-na';
    scoreboard = renderTelevoteScoreboard(
      slide.volgorde,
      data.jury,
      slide.ontvangenTelevote,
      slide.school,
      highlightIsNa
    );
    slideDiv.innerHTML = `
      <h2 style="margin-bottom:0.1em;">${slide.type === 'televote-voor' ? 'Televote voor' : 'Nieuwe stand'} ${slide.school}</h2>
      ${scoreboard}
      ${gelijkTekst}
      ${slide.type === 'televote-voor' ? `
        <p>Huidige punten: <span class="punten">${slide.huidig}</span></p>
        <div style="font-size:0.85em;margin:0.5em 0 0.25em 0;">
          Nog <b>${slide.nogTeGaan}</b> school${slide.nogTeGaan === 1 ? '' : 'en'} te gaan
        </div>
        <p style="font-size:0.8em;">${slide.verschil === 0 ? 'Staat bovenaan!' : `Heeft nog ${slide.verschil} punt${slide.verschil === 1 ? '' : 'en'} nodig voor de eerste plek.`}</p>
      ` : `
        <p>Televote: <span class="punten">${slide.televote}</span></p>
        <p>Totaal: <span class="punten">${slide.nieuw}</span></p>
      `}
    `;
  }
  if (slide.type === 'intro' || !slide.type) {
    slideDiv.innerHTML = `
      <h2 style="font-size:1.15em;">Puntenanimatie Songfestival</h2>
      <p style="font-size:0.9em;">Gebruik de spatiebalk, pijltjestoetsen of tik aan de rechter/ linker kant van je scherm voor navigatie.</p>
    `;
  }
  if (slide.type === 'eindstand') {
    // Verzamel punten
    let scholen = Object.keys(data.televote);
    let eindstand = scholen.map(school => {
      // Jury: som van alle punten voor deze school
      let vakjury = data.jury.reduce((acc, jury) => acc + (jury.punten[school] || 0), 0);
      let televote = data.televote[school] || 0;
      return {
        school,
        vakjury,
        televote,
        totaal: vakjury + televote
      };
    });
    // Sorteer op totaal aflopend
    eindstand.sort((a, b) => b.totaal - a.totaal);

    slideDiv.innerHTML = `
      <h2>🎉 Eindstand Songfestival</h2>
      <table style="margin:auto;max-width:600px;width:100%;font-size:1em;">
        <thead>
          <tr>
            <th style="text-align:left;">#</th>
            <th style="text-align:left;">School</th>
            <th style="text-align:right;">Jury</th>
            <th style="text-align:right;">Televote</th>
            <th style="text-align:right;">Totaal</th>
          </tr>
        </thead>
        <tbody>
          ${eindstand.map((row, i) => `
            <tr>
              <td>${i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : i+1}</td>
              <td>${row.school}</td>
              <td style="text-align:right;">${row.vakjury}</td>
              <td style="text-align:right;">${row.televote}</td>
              <td style="text-align:right;font-weight:bold;">${row.totaal}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
      <p style="margin-top:1.5em;font-size:1.13em;color:#ffd900;">Gefeliciteerd ${eindstand[0].school}!</p>
    `;
  }
  el.appendChild(slideDiv);
}

function showSlide(idx) {
  currentSlide = Math.max(0, Math.min(idx, slides.length - 1));
  renderSlide(slides[currentSlide]);
}
function nextSlide() { if (currentSlide < slides.length - 1) showSlide(currentSlide + 1); }
function prevSlide() { if (currentSlide > 0) showSlide(currentSlide - 1); }

document.addEventListener('keydown', e => {
  if ([' ', 'Space', 'ArrowRight', 'Enter'].includes(e.key)) { nextSlide(); e.preventDefault(); }
  if (e.key === 'ArrowLeft') { prevSlide(); e.preventDefault(); }
});
document.getElementById('slideshow').addEventListener('touchend', function(e) {
  if (e.changedTouches && e.changedTouches.length) {
    const x = e.changedTouches[0].clientX;
    const w = window.innerWidth;
    if (x < w / 2) {
      prevSlide();
    } else {
      nextSlide();
    }
    e.preventDefault();
  }
});
document.getElementById('slideshow').addEventListener('click', function(e) {
  const x = e.clientX;
  const w = window.innerWidth;
  if (x < w / 2) {
    prevSlide();
  } else {
    nextSlide();
  }
});

// Fullscreen functionaliteit
function goFullscreen() {
  const elem = document.documentElement;
  if (elem.requestFullscreen) {
    elem.requestFullscreen();
  } else if (elem.webkitRequestFullscreen) { /* Safari */
    elem.webkitRequestFullscreen();
  } else if (elem.msRequestFullscreen) { /* IE11 */
    elem.msRequestFullscreen();
  }
}

document.addEventListener('keydown', function(e) {
  if (e.key === 'f' || e.key === 'F11') {
    goFullscreen();
    e.preventDefault();
  }
});
document.getElementById('fullscreenBtn')?.addEventListener('click', goFullscreen);

fetch(DATA_PATH)
  .then(res => res.json())
  .then(json => {
    data = json;
    slides = [];
    slides.push({
      type: 'intro'
    });
    maakJurySlides(data.jury);
    maakTelevoteSlides(data.televote, data.jury);
    slides.push({
      type: 'eindstand'
    });
    showSlide(0);
  });
