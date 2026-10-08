/* ============================================================
   MODO FASES
   A pessoa descreve cada fase e suas etapas; o site monta a EAP
   (fases = entregas, etapas = pacotes) e encaixa cada etapa no
   grupo de processos do PMBOK correspondente.
   ============================================================ */

const GRUPOS_PMBOK = ["Iniciação", "Planejamento", "Execução", "Monitoramento e Controle", "Encerramento"];

// palavras que indicam em qual grupo do PMBOK uma etapa se encaixa
const PALAVRAS_GRUPO = [
  /^(inici|abert|viabilid|justific|propost|kick|stakeholder|identific|autoriz|aprov|charter|brief)/i,
  /^(planej|requisit|cronogram|orçament|orcament|escopo|levant|defin|estim|análi|anali|especific|model|prototip|design|mape|priori|organiz|prepar|roteiro|projetar)/i,
  /^(desenvolv|execut|implement|constru|produz|criar|criaç|mont|integr|configur|instal|treina|capacit|divulg|program|codific|compr|contrat|fabric|aplic)/i,
  /^(test|valid|revis|monitor|control|acompanh|avali|audit|qualidad|homolog|inspe|medi|indicador|ajust|corrig|verific|fiscaliz|confer)/i,
  /^(encerr|entreg|implant|lanç|lanc|public|aceit|finaliz|conclu|balanç|lições|licoes|go-live|inaugur|apresent|fechamento)/i
];

const REGEX_FASE = /^fase\s*\d*\s*[:\-–—]\s*(.+)$/i;
const REGEX_META = /^(prazo|equipe|orçamento|orcamento|custo)\s*[:\-–—]\s*(.+)$/i;
const REGEX_NOME = /^(projeto|nome|título|titulo)\s*[:\-–—]\s*(.+)$/i;
const REGEX_MARCADOR = /^([-•*–—]|\d+[.)])\s*/;

const maiuscula = s => s.charAt(0).toUpperCase() + s.slice(1);

// o texto está no formato de fases? (existe alguma linha "Fase: ...")
function temFases(texto) {
  return /^\s*fase\s*\d*\s*[:\-–—]\s*\S/im.test(texto);
}

// devolve o índice (0 a 4) do grupo do PMBOK, ou -1 se não reconhecer
function classificar(texto) {
  const palavras = texto.toLowerCase().split(/[\s,;:()\/]+/).filter(Boolean);
  for (const p of palavras) {
    const g = PALAVRAS_GRUPO.findIndex(r => r.test(p));
    if (g >= 0) return g;
  }
  return -1;
}

// lê o texto e separa: cabeçalho, informações do projeto e fases com etapas
function lerFases(texto) {
  const info = { titulo: "", cabecalho: [], meta: {} };
  const fases = [];
  let atual = null;

  for (const bruta of texto.split(/\r?\n/)) {
    const linha = bruta.trim();
    if (!linha) continue;

    let m;
    if ((m = linha.match(REGEX_NOME))) { info.titulo = m[2].trim(); continue; }
    if ((m = linha.match(REGEX_META))) {
      const chave = m[1].toLowerCase().replace("orcamento", "orçamento").replace("custo", "orçamento");
      info.meta[chave] = m[2].trim();
      continue;
    }
    if ((m = linha.match(REGEX_FASE))) {
      atual = { nome: m[1].trim(), etapas: [] };
      fases.push(atual);
      continue;
    }
    if (atual) {
      const etapa = linha.replace(REGEX_MARCADOR, "").trim();
      if (etapa.length >= 2) atual.etapas.push(etapa);
    } else {
      info.cabecalho.push(linha);
    }
  }
  return { info, fases };
}

// monta o plano completo a partir das fases
function gerarPlanoPorFases(texto) {
  const { info, fases } = lerFases(texto);
  const avisos = [];

  // título
  let titulo = info.titulo || (info.cabecalho[0] || "").split(/[.!?]/)[0]
    .replace(/^(eu\s+)?(quero|queremos|vou|vamos|preciso|precisamos|gostaria de|gostaríamos de)\s+(de\s+)?(criar|desenvolver|fazer|montar|construir|implantar|realizar|organizar)\s+(um|uma|o|a)?\s*/i, "")
    .replace(/[.:;]+$/, "").trim();
  titulo = maiuscula(titulo.slice(0, 60)) || "Projeto";

  // prazo, equipe e orçamento (linhas "Prazo: ..." ou frases no cabeçalho)
  const textoCab = info.cabecalho.join(" ");
  const mp = textoCab.match(/(\d+)\s*(dias?|semanas?|meses|mês|anos?)/i);
  const me = textoCab.match(/(\d+)\s*(pessoas?|membros?|integrantes?|colaboradores?|desenvolvedores?|funcionários?)/i);
  const mo = textoCab.match(/R\$\s*[\d.,]+(\s*(mil|milhões|milhão|k))?/i);
  const prazo = info.meta["prazo"] || (mp ? `${mp[1]} ${mp[2]}` : "A definir");
  const equipe = info.meta["equipe"] || (me ? `${me[1]} ${me[2]}` : "A definir");
  const orcamento = info.meta["orçamento"] || (mo ? mo[0] : "A definir");

  // limites do diagrama
  if (fases.length > 6) avisos.push("Só as 6 primeiras fases cabem no diagrama.");
  const usadas = fases.slice(0, 6);
  if (usadas.some(f => f.etapas.length > 6)) avisos.push("Só as 6 primeiras etapas de cada fase aparecem na EAP.");

  // EAP: fases viram entregas, etapas viram pacotes de trabalho
  const entregas = usadas.map(f => ({ nome: maiuscula(f.nome), pacotes: f.etapas.map(maiuscula) }));

  // PMBOK: cada etapa vai para o grupo certo
  const porGrupo = GRUPOS_PMBOK.map(() => []);
  usadas.forEach((f, i) => {
    const grupoDaFase = classificar(f.nome);
    const grupoPorPosicao = Math.min(4, Math.floor(i * 5 / usadas.length));
    f.etapas.forEach(etapa => {
      let g = classificar(etapa);
      if (g < 0) g = grupoDaFase;
      if (g < 0) g = grupoPorPosicao;
      porGrupo[g].push(maiuscula(etapa));
    });
  });

  const vazios = [];
  const grupos = porGrupo.map((lista, i) => {
    if (lista.length === 0) { vazios.push(GRUPOS_PMBOK[i]); return { itens: ["Nenhuma etapa informada"] }; }
    if (lista.length > 5) return { itens: [...lista.slice(0, 4), `+${lista.length - 4} outras etapas`] };
    return { itens: lista };
  });
  if (vazios.length) avisos.push(`Sem etapas em: ${vazios.join(", ")}. Considere incluir etapas para esses grupos do PMBOK.`);

  return {
    plano: {
      titulo,
      objetivo: "Entregar " + titulo.toLowerCase() + " dentro do prazo, custo e escopo acordados.",
      prazo, equipe, orcamento,
      riscos: ["Mudanças de escopo", "Atraso no cronograma", "Falta de recursos ou orçamento"],
      entregas, grupos
    },
    avisos
  };
}
