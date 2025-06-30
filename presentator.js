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

function maakJurySlides(juryArray) {
  const half = Math.floor(juryArray.length / 2);
  juryArray.forEach((jury, i) => {
    // Intro volgende vakjury
    slides.push({
      type: 'jury-intro',
      juryIndex: i,
      school: jury.school,
      presentator: jury.presentator
    });
    // Punten van deze jury
    slides.push({
      type: 'jury-punten',
      juryIndex: i,
      punten: sorteerPunten(jury.punten)
    });
    // Tussenstand direct na deze jury
    slides.push({
      type: 'tussenstand',
      totJury: i + 1,
    });
    // Reminder na de helft en na de laatste vakjury
    if (i + 1 === half || i + 1 === juryArray.length) {
      slides.push({
        type: 'reminder-greenroom',
        moment: (i + 1 === half ? 'halverwege' : 'einde')
      });
    }
  });
}

function maakTelevoteSlides(televote, juryArray) {
  let tussenstand = berekenTussenstand(juryArray, juryArray.length);
  const scholen = Object.keys(televote);
  scholen.forEach((school, idx) => {
    const huidig = tussenstand.find(([s]) => s === school)[1];
    const hoogste = Math.max(...tussenstand.map(([, p]) => p));
    const verschil = Math.max(0, hoogste - huidig + 1);
    slides.push({
      type: 'televote-voor',
      school,
      huidig,
      verschil
    });
    const nieuw = huidig + televote[school];
    slides.push({
      type: 'televote-na',
      school,
      nieuw,
      televote: televote[school]
    });
    // Tussenstand na iedere televote
    tussenstand = tussenstand.map(([s, p]) => [s, s === school ? nieuw : p]);
    slides.push({
      type: 'tussenstand',
      totJury: juryArray.length,
      televote: Object.fromEntries(scholen.slice(0, idx + 1).map(s => [s, televote[s]]))
    });
  });
  // Reminder: eindbespreking en greenroom na álle televotes
  slides.push({
    type: 'reminder-greenroom',
    moment: 'eind'
  });
}

function renderSlide(slide) {
  const el = document.getElementById('slideshow');
  el.innerHTML = '';
  const slideDiv = document.createElement('div');
  slideDiv.className = 'slide active';

  if (slide.type === 'jury-intro') {
    const p = slide.presentator;
    slideDiv.innerHTML = `
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
          `<li><span class="punten">${punten}</span> <span class="school">${school}</span></li>`
        ).join('')}
      </ul>
    `;
  }
  if (slide.type === 'tussenstand') {
    // televote kan gedeeltelijk zijn als object
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
        ${tussenstand.map(([school, punten]) =>
          `<li><span class="school">${school}</span>: <span class="punten">${punten}</span></li>`
        ).join('')}
      </ol>
    `;
  }
  if (slide.type === 'televote-voor') {
    slideDiv.innerHTML = `
      <h2>Televote voor ${slide.school}</h2>
      <p>Huidige punten: <span class="punten">${slide.huidig}</span></p>
      <p>${slide.verschil === 0 ? 'Staat bovenaan!' : `Heeft nog ${slide.verschil} punt${slide.verschil === 1 ? '' : 'en'} nodig voor de eerste plek.`}</p>
    `;
  }
  if (slide.type === 'televote-na') {
    slideDiv.innerHTML = `
      <h2>Nieuwe stand ${slide.school}</h2>
      <p>Televote: <span class="punten">${slide.televote}</span></p>
      <p>Totaal: <span class="punten">${slide.nieuw}</span></p>
    `;
  }
  if (slide.type === 'reminder-greenroom') {
    slideDiv.innerHTML = `
      <h2>Bespreek de tussenstand!</h2>
      <p>Presentator: neem even de tijd om de tussenstand met het publiek te bespreken.</p>
      <p>${slide.moment === 'eind' ? 'We gaan nu naar de greenroom en bereiden ons voor op het eindresultaat!' : 'Daarna schakelen we over naar de greenroom!'}</p>
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
document.addEventListener('touchend', e => { nextSlide(); e.preventDefault(); });
document.addEventListener('click', e => { nextSlide(); });

fetch(DATA_PATH)
  .then(res => res.json())
  .then(json => {
    data = json;
    slides = [];
    // Intro slide
    slides.push({
      type: 'intro'
    });
    maakJurySlides(data.jury);
    maakTelevoteSlides(data.televote, data.jury);
    showSlide(0);
  });
