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

<div class="resource-grid">
  <article class="resource-card">
    <span class="resource-type">Kahoot</span>
    <h3>English Grammar Challenge</h3>
    <p>Practice grammar through an engaging interactive quiz.</p>
    <a href="#" class="card-link">Open Resource</a>
  </article>

  <article class="resource-card">
    <span class="resource-type">Wordwall</span>
    <h3>Vocabulary Practice</h3>
    <p>Review useful English vocabulary through a playful activity.</p>
    <a href="#" class="card-link">Open Resource</a>
  </article>
</div>
    </section>

    <section id="about" class="about-section container">
      <h2>About the Project</h2>
      <p>
        This website brings together gamified English learning activities in one easy-to-use place.
      </p>
    </section>
  </main>
`