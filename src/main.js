import './style.css'
import { supabase } from './supabase.js'

document.querySelector('#app').innerHTML = `
  <header class="site-header">
    <div class="container">
      <h1>Kami's Gamified English Resources</h1>
      <p>Interactive Kahoot and Wordwall activities for engaging English lessons.</p>
      <nav class="main-nav">
  <a href="#">Home</a>
  <a href="/resources.html">Resources</a>
  <a href="#libraries">Libraries</a>
  <a href="/how-to-use.html">How to Use</a>
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

  <h3>Brilliant — Mixed English Challenge</h3>

  <p>
    A lively 31-question bilingual Kahoot combining vocabulary, grammar,
    translation, sentence building and visual tasks through a wide variety
    of interactive question types.
   Designed for learners in Grades 3–6, it keeps students actively involved through fast-paced and varied practice. 
  </p>

  <a
    href="https://create.kahoot.it/share/brilliant/da0281a5-161a-47ad-a1c5-398ae421257f"
    class="card-link"
    target="_blank"
    rel="noopener noreferrer"
  >
    Open in a New Tab
  </a>
</article>

  <article class="resource-card">
  <span class="resource-type">Wordwall</span>

  <h3>A General Review</h3>

  <p>
    A 30-question ESL review for 7th–9th grade covering Present Perfect,
    verb forms, phrasal verbs, time expressions, social language and
    vocabulary for communication and cultural awareness.
    Special emphasis is placed on practical phrasal verbs commonly used in professional and business contexts.
  </p>

  <a
    href="https://wordwall.net/resource/113866675"
    class="card-link"
    target="_blank"
    rel="noopener noreferrer"
  >
    Open in a New Tab
  </a>
</article>
</div>
<div class="how-to-link-wrap">
  <a href="/how-to-use.html" class="card-link">
    How to Use the Resources
  </a>
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
       <p>
  This project grew out of my everyday work as an English teacher. I create
  Kahoot and Wordwall activities mainly for learners from 2nd to 9th grade,
  especially beginners who need more visual support, clearer explanations
  and a stronger reason to stay engaged.
</p>

<p>
  The game-based format brings challenge, curiosity, fun and a healthy
  competitive spirit. It helps students learn while enjoying themselves,
  take part more actively, make mistakes without fear, try again and improve
  their results.
</p>

<p>
  I also genuinely enjoy creating the resources — designing original images
  and audio, searching for suitable GIFs and videos, and translating ideas
  from Bulgarian into English and back again. The activities combine grammar,
  vocabulary, storytelling, humour and meaningful topics, and can be used for
  classroom games, revision, tests and independent learning. This website
  brings my selected resources and public libraries together in one
  easy-to-use place.
</p> 
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

const {
  data: { user },
} = await supabase.auth.getUser()

if (user) {
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (roleData?.role === 'admin') {
    const adminLink = document.createElement('a')
    adminLink.href = '/admin.html'
    adminLink.textContent = 'Admin Panel'
    document.querySelector('.main-nav').append(adminLink)
  }
}