import './style.css'

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <div class="container">
      <h1>Kami's Gamified English Resources</h1>
      <p>Interactive Kahoot and Wordwall activities for engaging English lessons.</p>
      <nav class="main-nav">
  <a href="#">Home</a>
  <a href="#resources">Resources</a>
  <a href="#libraries">Libraries</a>
  <a href="#about">About</a>
</nav>
    </div>
  </header>

  <main>
    <section class="hero container">
      <div class="hero-content">
        <p class="eyebrow">Learn. Play. Enjoy.</p>
        <h2>Make English learning more engaging</h2>
        <p>
          Explore carefully selected gamified resources designed for students and teachers.
        </p>

        <div class="hero-actions">
          <a href="#resources" class="button primary-button">Browse Resources</a>
          <a href="#about" class="button primary-button">Learn More</a>
        </div>
      </div>
      <div class="hero-image">
  <img src="/src/assets/teacher-brain.png" alt="Miss Boshlova's Teacher Brain">
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
<section id="libraries" class="libraries-section container">
  <h2>Explore My Complete Resource Libraries</h2>
  <p>
    Discover all of my public English learning activities on Kahoot and Wordwall.
  </p>

  <div class="library-links">
    <a
      href="https://create.kahoot.it/profiles/97ccb93a-4801-4e36-a50d-33f363193ac7"
      class="button primary-button"
      target="_blank"
      rel="noopener noreferrer"
    >
      Explore My Full Kahoot Library
    </a>

    <a
      href="https://wordwall.net/teacher/27220547"
      class="button primary-button"
      target="_blank"
      rel="noopener noreferrer"
    >
      Explore My Full Wordwall Library
    </a>
  </div>
</section>
    <section id="about" class="about-section container">
      <h2>About the Project</h2>
      <p>
        This project brings together carefully selected Kahoot and Wordwall activities created by me for students from 2nd to 9th grade studying English as a second language in a non-intensive programme. Most of the resources are designed for beginner learners at A1 level. Many of the activities include original handmade illustrations, animated GIFs, audio, and other multimedia elements that support understanding and maintain students’ interest. They aim to make English learning more engaging, interactive, and enjoyable and can be used for grammar practice, vocabulary revision, tests, classroom games, and independent learning. The website brings all these resources together in one easy-to-use place and provides quick access to featured activities as well as my complete public resource libraries.
      </p>
    </section>
  </main>
  <footer class="site-footer">
  <div class="container">
    <p><strong>Created by Kameliya Boshlova</strong></p>
    <p>English Teacher & Creator of Gamified Learning Resources</p>
    <p>Kahoot • Wordwall • Interactive English Practice</p>
    <p>© 2026 Kameliya Boshlova. All rights reserved.</p>
  </div>
</footer>
`