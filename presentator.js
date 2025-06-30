// Zet hier het pad naar je punten.json (aanpassen indien nodig)
const DATA_PATH = 'punten.json';

// Hoeveel jury's tussen elke tussenstand? Bijvoorbeeld: 3 = na elke 3 jury's een tussenstand.
const TUSSENSTAND_INTERVAL = 3;

let data;
let slides = [];
let currentSlide = 0;

// Utility: Sorteer punten van hoog naar laag (behalve 0)
function sorteerPunten(punten) {
  return Object.entries(punten)
    .filter(([school, punten]) => punten > 0)
    .sort((a, b) => b[1] - a[1]);
}

// Utility: Bereken totaalscore per school tot een bepaald jury-index
function berekenTussenstand(juryArray, totIndex, televote = null) {
  const totaal = {};
  // Init
  juryArray.forEach(j => Object.keys(j.punten).forEach(s => (totaal[s] = 0)));
  // Jury's optellen
  juryArray.slice(0, totIndex).forEach(j => {
    Object.entries(j.punten).forEach(([school, punten]) => {
      totaal[school] += punten;
    });
  });
  // Televote toevoegen indien nodig
  if (televote) Object.entries(televote).forEach(([s, p]) => (totaal[s] += p));
  // Sorteren
  return Object.entries(totaal).sort((a, b) => b[1] - a[1]);
}

function maakJurySlides(juryArray) {
  juryArray.forEach((jury, i) => {
    // 1. Intro-slide volgende vakjury
    slides.push({
      type: 'jury-intro',
      juryIndex: i,
      school: jury.school,
      presentator: jury.presentator
    });
    // 2. Slide met punten van deze jury
    slides.push({
      type: 'jury-punten',
      juryIndex: i,
      punten: sorteerPunten(jury.punten)
    });
    // 3. Tussenstand indien nodig
    if ((i + 1) % TUSSENSTAND_INTERVAL === 0 && i < juryArray.length - 1) {
      slides.push({
        type: 'tussenstand',
        totJury: i + 1, // tot en met deze jury
      });
    }
  });
}

function maakTelevoteSlides(televote, juryArray) {
  // Eindstand vóór televote
  let tussenstand = berekenTussenstand(juryArray, juryArray.length);
  // Televote per school
  Object.keys(televote).forEach(school => {
    // Slide: huidige punten + wat heeft deze school nodig voor 1e plek
    const huidig = tussenstand.find(([s]) => s === school)[1];
    const hoogste = Math.max(...tussenstand.map(([, p]) => p));
    const verschil = Math.max(0, hoogste - huidig + 1);
    slides.push({
      type: 'televote-voor',
      school,
      huidig,
      verschil
    });
    // Slide: nieuwe punten na televote
    const nieuw = huidig + televote[school];
    slides.push({
      type: 'televote-na',
      school,
      nieuw,
      televote: televote[school]
    });
    // Tussenstand bijwerken voor volgende ronde
    tussenstand = tussenstand.map(([s, p]) => [s, s === school ? nieuw : p]);
  });
  // Totale eindstand slide
  slides.push({
    type: 'tussenstand-eind',
    televote: true
  });
}

// Render functies per slide-type
function renderSlide(slide) {
  const el = document.getElementById('slideshow');
  el.innerHTML = ''; // leegmaken

  if (slide.type === 'jury-intro') {
    const p = slide.presentator;
    el.innerHTML = `
      <div class="jury-intro">
        <img src="${p.foto}" alt="${p.naam}" class="presentator-foto">
        <h2>Volgende vakjury: ${slide.school}</h2>
        <h3>${p.naam}</h3>
        <p>${p.bio}</p>
      </div>
    `;
  }

  if (slide.type === 'jury-punten') {
    el.innerHTML = `
      <div class="jury-punten">
        <h2>Punten van de jury</h2>
        <ul>
          ${slide.punten.map(([school, punten]) =>
            `<li><span class="punten">${punten}</span> - <span class="school">${school}</span></li>`
          ).join('')}
        </ul>
      </div>
    `;
  }

  if (slide.type === 'tussenstand') {
    const tussenstand = berekenTussenstand(data.jury, slide.totJury);
    el.innerHTML = `
      <div class="tussenstand">
        <h2>Tussenstand na ${slide.totJury} jury's</h2>
        <ol>
          ${tussenstand.map(([school, punten]) =>
            `<li><span class="school">${school}</span>: <span class="punten">${punten}</span></li>`
          ).join('')}
        </ol>
      </div>
    `;
  }

  if (slide.type === 'televote-voor') {
    el.innerHTML = `
      <div class="televote-voor">
        <h2>Televote voor ${slide.school}</h2>
        <p>Huidige punten: <span class="punten">${slide.huidig}</span></p>
        <p>${slide.verschil === 0 ? 'Staat bovenaan!' : `Heeft nog ${slide.verschil} punt${slide.verschil === 1 ? '' : 'en'} nodig voor de eerste plek.`}</p>
      </div>
    `;
  }

  if (slide.type === 'televote-na') {
    el.innerHTML = `
      <div class="televote-na">
        <h2>Nieuwe stand ${slide.school}</h2>
        <p>Televote: <span class="punten">${slide.televote}</span></p>
        <p>Totaal: <span class="punten">${slide.nieuw}</span></p>
      </div>
    `;
  }

  if (slide.type === 'tussenstand-eind') {
    const eindstand = berekenTussenstand(data.jury, data.jury.length, data.televote);
    el.innerHTML = `
      <div class="tussenstand eind">
        <h2>Eindstand na televote</h2>
        <ol>
          ${eindstand.map(([school, punten]) =>
            `<li><span class="school">${school}</span>: <span class="punten">${punten}</span></li>`
          ).join('')}
        </ol>
      </div>
    `;
  }
}

// Navigatie (keyboard & touch)
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
// Touch/click voor touchscreen en gemak
document.addEventListener('touchend', e => { nextSlide(); e.preventDefault(); });
document.addEventListener('click', e => { nextSlide(); });

fetch(DATA_PATH)
  .then(res => res.json())
  .then(json => {
    data = json;
    maakJurySlides(data.jury);
    maakTelevoteSlides(data.televote, data.jury);
    showSlide(0);
  });
