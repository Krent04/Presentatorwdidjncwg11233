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
    // Reminder alleen na de helft en na de laatste jury
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

  scholenVolgorde.forEach((school, idx) => {
    const huidig = tussenstand.find(([s]) => s === school)[1];
    const hoogste = Math.max(...tussenstand.map(([, p]) => p));
    const verschil = Math.max(0, hoogste - huidig + 1);
    slides.push({
      type: 'televote-voor',
      school,
      huidig,
      verschil,
      schoolNummer: idx + 1,
      schoolTotal: scholenVolgorde.length,
      nogTeGaan: scholenVolgorde.length - (idx + 1),
      volgorde: scholenVolgorde,
    });
    const nieuw = huidig + televote[school];
    slides.push({
      type: 'televote-na',
      school,
      nieuw,
      televote: televote[school]
    });
    // Update tussenstand
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

function renderSlide(slide) {
  const el = document.getElementById('slideshow');
  el.innerHTML = '';
  const slideDiv = document.createElement('div');
  slideDiv.className = 'slide active';

  if (slide.type === 'jury-intro') {
    const p = slide.presentator;
    slideDiv.innerHTML = `
      <div style="font-size:0.97em;margin-bottom:0.2em;">Vakjury ${slide.juryNummer} van ${slide.juryTotal}</div>
      ${renderJuryProgress(slide.juryIndex, slide.juryTotal, slide.allJuryNamen)}
      <img src="${p.foto}" alt="${p.naam}" class="presentator-foto">
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
  if (slide.type === 'televote-voor') {
    slideDiv.innerHTML = `
      <h2>Televote voor ${slide.school}</h2>
      <p>Huidige punten: <span class="punten">${slide.huidig}</span></p>
      <div style="font-size:0.85em;margin:0.5em 0 0.25em 0;">
        Nog <b>${slide.nogTeGaan}</b> school${slide.nogTeGaan === 1 ? '' : 'en'} te gaan
      </div>
      <p style="font-size:0.8em;">${slide.verschil === 0 ? 'Staat bovenaan!' : `Heeft nog ${slide.verschil} punt${slide.verschil === 1 ? '' : 'en'} nodig voor de eerste plek.`}</p>
    `;
  }
  if (slide.type === 'televote-na') {
    slideDiv.innerHTML = `
      <h2>Nieuwe stand ${slide.school}</h2>
      <p>Televote: <span class="punten">${slide.televote}</span></p>
      <p>Totaal: <span class="punten">${slide.nieuw}</span></p>
    `;
  }
  if (slide.type === 'intro' || !slide.type) {
    slideDiv.innerHTML = `
      <h2 style="font-size:1.15em;">Puntenanimatie Songfestival</h2>
      <p style="font-size:0.9em;">Gebruik de spatiebalk, pijltjestoetsen of tik aan de rechter/ linker kant van je scherm voor navigatie.</p>
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
    showSlide(0);
  });
