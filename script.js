const $ = id => document.getElementById(id);
const COLORS = ["#2f5bea", "#16a34a", "#d97706", "#9333ea", "#dc2626", "#0891b2"];

/* ---------- FUNÇÕES AUXILIARES ---------- */
const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function wrap(t, n) {
  const w = String(t || "").split(/\s+/), l = [];
  let c = "";
  for (const x of w) {
    if ((c + " " + x).trim().length > n && c) { l.push(c); c = x; }
    else c = (c + " " + x).trim();
  }
  if (c) l.push(c);
  return l;
}

function textBlock(lines, x, y, lh, attrs) {
  return lines.map((l, i) => `<text x="${x}" y="${y + i * lh}" ${attrs}>${esc(l)}</text>`).join("");
}

/* ---------- GERAÇÃO DO PLANO (sem IA) ---------- */
function gerarPlano(texto) {
  const t = texto.replace(/\s+/g, " ").trim();

  // título: primeira frase, sem verbos de intenção no começo
  let titulo = t.split(/[.!?\n]/)[0]
    .replace(/\s+(com|incluindo|contendo)\s+.*/i, "")
    .replace(/^(eu\s+)?(quero|queremos|vou|vamos|preciso|precisamos|gostaria de|gostaríamos de)\s+(de\s+)?(criar|desenvolver|fazer|montar|construir|implantar|realizar|organizar)\s+(um|uma|o|a)?\s*/i, "")
    .trim();
  titulo = cap(titulo.slice(0, 60)) || "Projeto";

  // prazo, equipe, orçamento
  const mp = t.match(/(\d+)\s*(dias?|semanas?|meses|mês|anos?)/i);
  const me = t.match(/(\d+)\s*(pessoas?|membros?|integrantes?|colaboradores?|desenvolvedores?|funcionários?)/i);
  const mo = t.match(/R\$\s*[\d.,]+(\s*(mil|milhões|milhão|k))?/i);
  const prazo = mp ? `${mp[1]} ${mp[2]}` : "A definir";
  const equipe = me ? `${me[1]} ${me[2]}` : "A definir";
  const orcamento = mo ? mo[0] : "A definir";

  // entregas: lista depois de "com / incluindo / contendo"
  const restricao = /\d+\s*(dias?|semanas?|meses|mês|anos?|pessoas?|membros?|integrantes?|colaboradores?|desenvolvedores?|funcionários?)|R\$|^(prazo|equipe|orçamento|custo)\b/i;
  const limpar = a => a
    .map(s => s.replace(/^(e|o|a|os|as|um|uma)\s+/i, "").trim())
    .filter(s => s.length >= 3 && s.length <= 50 && !restricao.test(s));

  let itens = [];
  const m = t.match(/\b(?:com|incluindo|contendo)\s+([^.!?;]+)/i);
  if (m) itens = limpar(m[1].split(/,|;|\s+e\s+/));
  if (itens.length < 2) {
    const partes = t.split(/[,;.!?\n]|\s+e\s+/);
    itens = limpar(partes.slice(1));
  }
  if (itens.length < 2) itens = ["Planejamento", "Desenvolvimento", "Testes", "Implantação"];

  const entregas = itens.slice(0, 5).map(i => ({
    nome: cap(i),
    pacotes: ["Definir requisitos", "Executar a entrega", "Testar e validar", "Documentar e entregar"]
  }));
  entregas.push({
    nome: "Gerenciamento do projeto",
    pacotes: ["Termo de abertura", "Plano do projeto", "Reuniões de status", "Encerramento e lições aprendidas"]
  });

  const grupos = [
    { itens: ["Termo de abertura do projeto", "Identificar partes interessadas", "Definir objetivo: " + titulo] },
    { itens: ["Plano de escopo e EAP", "Cronograma e marcos", "Orçamento e recursos", "Plano de riscos e comunicação"] },
    { itens: ["Executar as entregas da EAP", "Gerenciar a equipe", "Comunicar com as partes interessadas"] },
    { itens: ["Acompanhar prazo e custo", "Controlar mudanças de escopo", "Revisar riscos e qualidade"] },
    { itens: ["Aceite final das entregas", "Lições aprendidas", "Encerrar contratos e documentação"] }
  ];

  return {
    titulo,
    objetivo: "Entregar " + titulo.toLowerCase() + " dentro do prazo, custo e escopo acordados.",
    prazo, equipe, orcamento,
    riscos: ["Mudanças de escopo", "Atraso no cronograma", "Falta de recursos ou orçamento"],
    entregas, grupos
  };
}

/* ---------- DESENHO DO DIAGRAMA (SVG) ---------- */
function buildSVG(d) {
  const W = 1200, pad = 20, ent = (d.entregas || []).slice(0, 6), n = Math.max(ent.length, 1);
  const colW = (W - pad * 2) / n, boxW = colW - 14;
  const wrapN = Math.max(12, Math.floor(boxW / 7));
  let s = "", y = pad;

  // título
  const tl = wrap(d.titulo || "Projeto", 60);
  s += `<text x="${W / 2}" y="${y + 22}" text-anchor="middle" font-size="24" font-weight="700" fill="#1d2433">Diagrama do Projeto</text>`;
  s += `<text x="${W / 2}" y="${y + 46}" text-anchor="middle" font-size="15" fill="#5d6679">${esc(tl[0] || "")}</text>`;
  y += 70;

  // EAP
  s += `<text x="${pad}" y="${y}" font-size="16" font-weight="700" fill="#2f5bea">EAP — Estrutura Analítica do Projeto</text>`;
  y += 14;
  const rootW = 360, rootH = 44, rx = W / 2 - rootW / 2;
  s += `<rect x="${rx}" y="${y}" width="${rootW}" height="${rootH}" rx="8" fill="#1d2433"/>`;
  const rl = wrap(d.titulo || "Projeto", 38).slice(0, 2);
  s += textBlock(rl, W / 2, y + (rl.length > 1 ? 19 : 27), 16, 'text-anchor="middle" font-size="14" font-weight="700" fill="#fff"');

  const rootBottom = y + rootH, busY = rootBottom + 24, l1Y = busY + 24, l1H = 54;
  const cx = i => pad + colW * i + colW / 2;
  s += `<line x1="${W / 2}" y1="${rootBottom}" x2="${W / 2}" y2="${busY}" stroke="#8a93a8" stroke-width="2"/>`;
  if (n > 1) s += `<line x1="${cx(0)}" y1="${busY}" x2="${cx(n - 1)}" y2="${busY}" stroke="#8a93a8" stroke-width="2"/>`;

  let maxBottom = l1Y + l1H;
  ent.forEach((e, i) => {
    const c = COLORS[i % COLORS.length], x = cx(i) - boxW / 2;
    s += `<line x1="${cx(i)}" y1="${busY}" x2="${cx(i)}" y2="${l1Y}" stroke="#8a93a8" stroke-width="2"/>`;
    s += `<rect x="${x}" y="${l1Y}" width="${boxW}" height="${l1H}" rx="8" fill="${c}"/>`;
    s += `<text x="${x + 8}" y="${l1Y + 14}" font-size="10" fill="#fff" opacity=".8">${i + 1}.0</text>`;
    const nl = wrap(e.nome, wrapN).slice(0, 2);
    s += textBlock(nl, cx(i), l1Y + (nl.length > 1 ? 27 : 34), 16, 'text-anchor="middle" font-size="13" font-weight="700" fill="#fff"');

    let py = l1Y + l1H + 12;
    (e.pacotes || []).slice(0, 6).forEach(p => {
      const pl = wrap(p, wrapN).slice(0, 3), h = 14 + pl.length * 15;
      s += `<line x1="${cx(i)}" y1="${py - 12}" x2="${cx(i)}" y2="${py}" stroke="${c}" stroke-width="1.5"/>`;
      s += `<rect x="${x}" y="${py}" width="${boxW}" height="${h}" rx="6" fill="#fff" stroke="${c}" stroke-width="1.5"/>`;
      s += textBlock(pl, x + 8, py + 19, 15, 'font-size="12" fill="#1d2433"');
      py += h + 12;
    });
    maxBottom = Math.max(maxBottom, py - 12);
  });
  y = maxBottom + 36;

  // PMBOK
  s += `<text x="${pad}" y="${y}" font-size="16" font-weight="700" fill="#2f5bea">PMBOK — Grupos de Processos</text>`;
  y += 14;
  const gs = d.grupos || [], gw = (W - pad * 2) / 5, gbw = gw - 10, gn = Math.max(10, Math.floor(gbw / 6.6));
  const names = ["Iniciação", "Planejamento", "Execução", "Monitoramento e Controle", "Encerramento"];
  const prep = names.map((nm, i) => {
    const g = gs[i] || {};
    return { nm, itens: (g.itens || []).slice(0, 5).map(t => wrap(t, gn).slice(0, 3)) };
  });
  const gh = Math.max(...prep.map(g => 44 + g.itens.reduce((a, l) => a + l.length * 14 + 6, 0))) + 8;

  prep.forEach((g, i) => {
    const x = pad + gw * i + 5, c = COLORS[i % COLORS.length];
    s += `<rect x="${x}" y="${y}" width="${gbw}" height="${gh}" rx="8" fill="#f1f4fb" stroke="${c}" stroke-width="1.5"/>`;
    s += `<path d="M${x} ${y + 8}a8 8 0 0 1 8-8h${gbw - 16}a8 8 0 0 1 8 8v28h-${gbw}z" fill="${c}"/>`;
    const hl = wrap(g.nm, gn).slice(0, 2);
    s += textBlock(hl, x + gbw / 2, y + (hl.length > 1 ? 17 : 24), 15, 'text-anchor="middle" font-size="12.5" font-weight="700" fill="#fff"');
    if (i < 4) s += `<path d="M${x + gbw + 1} ${y + 18}l8 0" stroke="#8a93a8" stroke-width="2"/>`;

    let ty = y + 54;
    g.itens.forEach(l => {
      s += `<text x="${x + 8}" y="${ty}" font-size="11" fill="${c}">●</text>`;
      s += textBlock(l, x + 22, ty, 14, 'font-size="11.5" fill="#1d2433"');
      ty += l.length * 14 + 6;
    });
  });
  y += gh + 28;

  // resumo
  const info = [
    ["Objetivo", d.objetivo],
    ["Prazo", d.prazo],
    ["Equipe", d.equipe],
    ["Orçamento", d.orcamento],
    ["Riscos principais", (d.riscos || []).join("; ")]
  ].filter(r => r[1]);

  info.forEach(([k, v]) => {
    const l = wrap(v, 170);
    s += `<text x="${pad}" y="${y}" font-size="12.5" font-weight="700" fill="#1d2433">${esc(k)}:</text>`;
    s += textBlock(l.slice(0, 3), pad + 130, y, 15, 'font-size="12.5" fill="#1d2433"');
    y += Math.min(l.length, 3) * 15 + 6;
  });
  y += pad - 6;

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${y}" width="${W}" height="${y}" font-family="Arial, Helvetica, sans-serif"><rect width="${W}" height="${y}" fill="#ffffff"/>${s}</svg>`;
}

/* ---------- BOTÕES ---------- */
let svgText = "";

$("go").onclick = () => {
  const t = $("txt").value.trim();
  if (t.length < 15) { $("msg").textContent = "Descreva um pouco mais o projeto."; return; }

  let plano, avisos = [];
  if (temFases(t)) {
    ({ plano, avisos } = gerarPlanoPorFases(t));
  } else {
    plano = gerarPlano(t);
  }

  svgText = buildSVG(plano);
  $("svgbox").innerHTML = svgText;
  $("out").style.display = "block";
  $("dl").style.display = "inline-block";
  $("msg").textContent = avisos.join(" ");
  $("out").scrollIntoView({ behavior: "smooth" });
};

$("dl").onclick = async () => {
  try {
    const m = svgText.match(/viewBox="0 0 (\d+) (\d+)"/), w = +m[1], h = +m[2], k = 2;
    const img = new Image();
    const url = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgText);
    await new Promise((ok, no) => { img.onload = ok; img.onerror = no; img.src = url; });

    const c = document.createElement("canvas");
    c.width = w * k; c.height = h * k;
    const g = c.getContext("2d");
    g.fillStyle = "#fff"; g.fillRect(0, 0, c.width, c.height);
    g.drawImage(img, 0, 0, c.width, c.height);

    const blob = await new Promise(r => c.toBlob(r, "image/png"));
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "diagrama-projeto.png";
    a.click();
    URL.revokeObjectURL(a.href);
  } catch (e) {
    $("msg").textContent = "Não foi possível baixar a imagem.";
  }
};
