import './style.css'

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <div class="container">
      <h1>Kami's Gamified English Resources</h1>
      <p>Interactive Kahoot and Wordwall activities for engaging English lessons.</p>
    </div>
  </header>

  <main>
    <section class="hero container">
      <div class="hero-content">
        <p class="eyebrow">Learn. Play. Improve.</p>
        <h2>Make English learning more engaging</h2>
        <p>
          Explore carefully selected gamified resources designed for students and teachers.
        </p>

        <div class="hero-actions">
          <a href="#resources" class="button primary-button">Browse Resources</a>
          <a href="#about" class="button secondary-button">Learn More</a>
        </div>
      </div>
    </section>

    <section id="resources" class="resources-section container">
      <h2>Featured Resources</h2>
      <p>Our first Kahoot and Wordwall activities will appear here.</p>
    </section>

    <section id="about" class="about-section container">
      <h2>About the Project</h2>
      <p>
        This website brings together gamified English learning activities in one easy-to-use place.
      </p>
    </section>
  </main>
`