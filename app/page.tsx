import Link from "next/link";

export default function HomePage() {
  return (
    <>
      <header>
        <div className="container">
          <nav className="nav">
            <div className="logo-block">
              {/* Ajusta o caminho do logo para o teu ficheiro real em /public */}
              <img src="/logo.png" alt="Mocidade Invicta Futebol Clube" className="logo-img" />
              <div className="logo-area">
                <span className="logo-title">Mocidade Invicta</span>
                <span className="logo-sub">Futebol Clube · Porto · desde 1931</span>
              </div>
            </div>

            <div className="nav-links">
              <a href="#sobre">O clube</a>
              <a href="#quotas">Quotas</a>
              <Link className="nav-cta" href="/inscricao">
                Quero ser sócio
              </Link>
            </div>
          </nav>
        </div>
      </header>

      <main>
        <section className="hero" id="topo">
          <div className="container hero-inner">
            <div>
              <div className="hero-label">
                <span className="hero-dot" />
                <span>Campanha de captação de sócios</span>
              </div>

              <div className="hero-eyebrow">Chamada aos amigos do clube</div>

              <h1 className="hero-title">
                O Mocidade precisa <span>de ti</span>
              </h1>

              <p className="hero-subtext">
                O Mocidade Invicta Futebol Clube é um histórico da cidade do Porto, com mais de 90 anos de vida.
                Para continuar a escrever esta história, o clube precisa de ti como sócio e como voz ativa na comunidade.
              </p>

              <div className="hero-bullets">
                <span className="hero-chip">Inscrição 100% online</span>
                <span className="hero-chip">Poucos minutos, impacto para muitos anos</span>
                <span className="hero-chip">Apoia o clube do teu bairro</span>
              </div>

              <div className="hero-cta-row">
                <Link className="primary-btn" href="/inscricao">
                  Quero ser sócio agora <span>→</span>
                </Link>

                <a className="secondary-link" href="#sobre">
                  Quero primeiro saber mais
                </a>
              </div>
            </div>

            <aside className="hero-side-card">
              <div className="hero-side-title">Porque agora?</div>

              <div className="hero-side-highlight">
                +90 anos <span>de história</span>
              </div>

              <p className="hero-side-desc">
                O clube está a renovar-se e a reforçar projetos. Para que esta fase seja sustentável,
                precisamos de crescer a massa associativa.
              </p>

              <ul className="hero-side-list">
                <li>
                  <span className="hero-side-dot-small" />
                  <span>Ser sócio dá-te voz nas assembleias e decisões.</span>
                </li>
                <li>
                  <span className="hero-side-dot-small" />
                  <span>Ajuda direta às equipas e aos projetos do clube.</span>
                </li>
                <li>
                  <span className="hero-side-dot-small" />
                  <span>Condições especiais em atividades e eventos.</span>
                </li>
              </ul>

              <div className="hero-side-footer">
                <span>
                  Tempo médio de inscrição: <strong>2 minutos</strong>
                </span>
                <span>
                  <strong>Partilha este link</strong> com amigos do clube.
                </span>
              </div>
            </aside>
          </div>
        </section>

        <section id="sobre">
          <div className="container">
            <h2 className="section-title">O clube</h2>
            <p className="section-subtitle">
              O Mocidade Invicta Futebol Clube nasceu no coração da cidade do Porto e cresceu com ela.
              Um clube de bairro, de portas abertas, onde o desporto e o associativismo se cruzam diariamente.
            </p>

            <div className="about-grid">
              <div className="card">
                <p>
                  Ao longo de décadas, o Mocidade Invicta formou atletas, treinadores, dirigentes e, acima de tudo, pessoas.
                  Hoje, o clube vive uma fase de renovação e precisa de consolidar a família de sócios para continuar a cumprir a sua missão.
                </p>

                <p style={{ marginTop: "0.7rem" }}>
                  Quando te tornas sócio, não estás apenas a apoiar uma equipa. Estás a ajudar a preservar um espaço de convivência,
                  formação e identidade na cidade do Porto.
                </p>

                <div className="tag-row">
                  <span className="tag-pill">Clube histórico</span>
                  <span className="tag-pill">Cidade do Porto</span>
                  <span className="tag-pill">Formação</span>
                  <span className="tag-pill">Comunidade</span>
                </div>
              </div>

              <div className="card" id="quotas">
                <strong style={{ fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: "0.08em", color: "#6b7280" }}>
                  Tabela de quotas (indicativo)
                </strong>

                <table className="quotas-table">
                  <thead>
                    <tr>
                      <th>Tipo</th>
                      <th>Idades</th>
                      <th>Quota mensal</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Normal</td>
                      <td>13+ anos</td>
                      <td>2 €</td>
                    </tr>
                    <tr>
                      <td>Isento</td>
                      <td>até 12 anos</td>
                      <td>0 €</td>
                    </tr>
                  </tbody>
                </table>

                <p style={{ marginTop: "0.5rem", fontSize: "0.76rem", color: "#6b7280" }}>
                  Os valores oficiais são definidos em sede própria (assembleia / direção).
                </p>

                <div style={{ marginTop: "0.9rem", display: "flex", gap: "0.6rem", flexWrap: "wrap" }}>
                  <Link className="primary-btn" href="/inscricao">
                    Quero inscrever-me <span>→</span>
                  </Link>
                  <a className="btn-outline" href="#topo">
                    Voltar ao topo
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer>
        Mocidade Invicta Futebol Clube · Porto · &copy; {new Date().getFullYear()}
      </footer>
    </>
  );
}
