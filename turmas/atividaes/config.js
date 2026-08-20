// Matérias/trilhas/módulos da turma Sistemas (9 matérias no total).
// Consumido por plataforma.html (via window.TURMA_CONFIG) — inclusive pela
// aba "Gestão" do próprio portal (shared/platform-core.js), que lê isso
// pra montar as colunas de desempenho por trilha do relatório de notas e a
// lista de aulas com geração de slides (campo hasSlides).
//
// Só dentro de uma matéria é que as trilhas aparecem (ver renderMaterias/
// openMateria em shared/platform-core.js). Por enquanto só Banco de Dados tem
// conteúdo de verdade — as demais são placeholders prontos pra receber
// trilhas quando o currículo de cada uma for definido.
//
// Pra adicionar uma trilha nova numa matéria, edite o array `trilhas` dela
// (mesmo formato usado em turmas/jogos/config.js) — nenhum outro arquivo
// precisa mudar.
window.TURMA_CONFIG_SISTEMAS = {
  id: 'sistemas',
  label: 'Sistemas',
  materias: [
    {
      key: 'banco-dados',
      label: 'Banco de Dados',
      trilhas: [
        {
          key: 'sql',
          label: 'SQL',
          desc: 'Aprenda a teoria e depois pratique resolvendo chamados de verdade.',
          capacidade: 'Aplicar linguagem para consulta, manipulação e controle do banco de dados.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Fundamentos de SQL e PL/SQL',
              desc: 'Tabelas, colunas, chave primária, SELECT/WHERE/ORDER BY/INSERT/UPDATE/DELETE, JOIN entre tabelas, agregação com GROUP BY e os fundamentos de PL/SQL.',
              icon: '📖', src: 'atividades/sql-basico-teoria.html',
              progressKey: 'sql_basico_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'basico', title: 'Prática — Central de Dados',
              desc: 'Resolva chamados escrevendo consultas SQL de verdade contra um banco de exemplo, direto no navegador.',
              icon: '🗄️', src: 'atividades/sql-basico.html',
              progressKey: 'sql_basico_progress_', progressTotal: 8,
              requires: 'teoria', hasGabarito: true
            },
            {
              key: 'join', title: 'Prática — Central de Dados: Relatórios (JOIN)',
              desc: 'Cruze dados de funcionários e departamentos com JOIN pra montar relatórios de verdade.',
              icon: '🔗', src: 'atividades/sql-join.html',
              progressKey: 'sql_join_progress_', progressTotal: 5,
              requires: 'basico', hasGabarito: true
            },
            {
              key: 'agregacao', title: 'Prática — Central de Dados: Estatísticas (GROUP BY)',
              desc: 'Some, conte e tire médias com funções de agregação e GROUP BY.',
              icon: '📊', src: 'atividades/sql-agregacao.html',
              progressKey: 'sql_agregacao_progress_', progressTotal: 5,
              requires: 'join', hasGabarito: true
            }
          ]
        },
        {
          key: 'sql-comentarios',
          label: 'Documentação de Código',
          desc: 'Aprenda a documentar consultas e blocos PL/SQL com comentários claros.',
          capacidade: 'Empregar comentários para documentação do código fonte.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Comentários em SQL e PL/SQL',
              desc: 'Sintaxe de comentários de uma linha e de bloco, e onde/por que comentar código SQL e PL/SQL.',
              icon: '📝', src: 'atividades/sql-comentarios-teoria.html',
              progressKey: 'sql_comentarios_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'dev-sistemas-1',
      label: 'Desenvolvimento de Sistemas 1',
      trilhas: [
        {
          key: 'devsis-apis-frameworks',
          label: 'APIs, Bibliotecas e Frameworks',
          desc: 'Aprenda a teoria e depois resolva chamados sobre ferramentas, boas práticas, APIs e frameworks.',
          capacidade: 'Aplicar linguagem de programação por meio de apis, bibliotecas, frameworks na construção de rotinas de software.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Ferramentas, APIs e Frameworks',
              desc: 'VS Code, Git local, compilação x interpretação, debugging, convenções de nomenclatura, peer review, consumo de APIs/JSON, bibliotecas, frameworks, CLI scaffold, componentes e rotas.',
              icon: '🧑‍💻', src: 'atividades/devsis-apis-frameworks-teoria.html',
              progressKey: 'devsis_apis_frameworks_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Sistemas: Ferramentas e APIs',
              desc: 'Resolva chamados escolhendo a ferramenta, convenção ou tecnologia certa pra cada cenário.',
              icon: '🛠️', src: 'atividades/devsis-apis-frameworks-pratica.html',
              progressKey: 'devsis_apis_frameworks_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'devsis-requisitos-tecnologias',
          label: 'Tecnologias e Requisitos',
          desc: 'Aprenda a teoria e depois pratique escolhendo tecnologias de acordo com requisitos funcionais e não funcionais.',
          capacidade: 'Definir tecnologias de acordo com os requisitos não funcionais / funcionais.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Requisitos Funcionais e Não Funcionais',
              desc: 'Diferença entre requisito funcional e não funcional, e como escolher APIs, bibliotecas e frameworks a partir deles.',
              icon: '📋', src: 'atividades/devsis-requisitos-teoria.html',
              progressKey: 'devsis_requisitos_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Sistemas: Requisitos',
              desc: 'Resolva chamados classificando requisitos e escolhendo tecnologias de acordo com eles.',
              icon: '📐', src: 'atividades/devsis-requisitos-pratica.html',
              progressKey: 'devsis_requisitos_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'devsis-linguagem-plataforma',
          label: 'Linguagem e Plataforma',
          desc: 'Aprenda a teoria e depois pratique escolhendo a linguagem e a plataforma certas pra cada projeto.',
          capacidade: 'Selecionar linguagem de programação de acordo com os requisitos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Linguagens e Plataformas',
              desc: 'Linguagens dominantes para Web, Desktop e Mobile, responsividade multiplataforma, testes de compatibilidade e build/empacotamento.',
              icon: '🖥️', src: 'atividades/devsis-linguagem-teoria.html',
              progressKey: 'devsis_linguagem_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Sistemas: Linguagem e Plataforma',
              desc: 'Resolva chamados escolhendo a linguagem e a plataforma certas pra cada cenário de projeto.',
              icon: '📱', src: 'atividades/devsis-linguagem-pratica.html',
              progressKey: 'devsis_linguagem_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'redes-computadores',
      label: 'Redes de Computadores',
      trilhas: [
        {
          key: 'redes-conexao',
          label: 'Conexão e Endereçamento IP',
          desc: 'Aprenda a teoria e depois resolva chamados sobre topologias, meios físicos e endereçamento IP.',
          capacidade: 'Identificar tipos e tecnologias de conexão a redes de computadores.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Conexão e Endereçamento IP',
              desc: 'Topologias físicas, meios de cabeamento, interfaces Ethernet/Wireless/Bluetooth, gateway, IPv4/IPv6, máscara de sub-rede, ping e tracert.',
              icon: '📡', src: 'atividades/redes-conexao-teoria.html',
              progressKey: 'redes_conexao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Redes: Conexões',
              desc: 'Resolva chamados escolhendo o meio físico, dispositivo ou comando certo pra cada cenário.',
              icon: '🔌', src: 'atividades/redes-conexao-pratica.html',
              progressKey: 'redes_conexao_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'redes-resolucao-problemas',
          label: 'Resolução de Problemas de Rede',
          desc: 'Aprenda o método de diagnóstico e depois pratique identificando a causa de falhas reais.',
          capacidade: 'Resolução de problemas complexos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Diagnóstico de Problemas de Rede',
              desc: 'Metodologia de diagnóstico por camadas, falhas físicas, conflito de IP, máscara de sub-rede errada e isolamento de causa.',
              icon: '🩺', src: 'atividades/redes-resolucao-teoria.html',
              progressKey: 'redes_resolucao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Redes: Diagnóstico',
              desc: 'Analise sintomas reais e aponte a causa mais provável de cada chamado.',
              icon: '🔍', src: 'atividades/redes-resolucao-pratica.html',
              progressKey: 'redes_resolucao_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'redes-servicos-modelos',
          label: 'Serviços de Internet e Modelos',
          desc: 'Aprenda a teoria e depois pratique reconhecendo serviços, portas e camadas de rede.',
          capacidade: 'Reconhecer tipos e características (classificação, estrutura e modelos).',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Serviços de Internet e Modelos OSI/TCP-IP',
              desc: 'DHCP, Web, E-mail, FTP, acesso remoto, comunicação em tempo real, portas padrão e as camadas dos modelos OSI e TCP/IP.',
              icon: '🌐', src: 'atividades/redes-servicos-teoria.html',
              progressKey: 'redes_servicos_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Redes: Serviços',
              desc: 'Associe cada chamado ao serviço, porta ou camada de rede correta.',
              icon: '🛰️', src: 'atividades/redes-servicos-pratica.html',
              progressKey: 'redes_servicos_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'redes-armazenamento',
          label: 'Armazenamento e Ativos de Rede',
          desc: 'Aprenda a teoria e depois pratique reconhecendo ativos de rede e unidades de medida.',
          capacidade: 'Reconhecer componentes e ativos de redes / Reconhecer unidades de medida empregadas na transmissão e armazenamento de dados.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Armazenamento e Ativos de Rede',
              desc: 'Local x rede x nuvem, switch/roteador/access point, bit x byte, Mbps x MB/s, redundância e políticas de backup.',
              icon: '💾', src: 'atividades/redes-armazenamento-teoria.html',
              progressKey: 'redes_armazenamento_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Redes: Armazenamento',
              desc: 'Resolva chamados sobre ativos de rede, unidades de medida, redundância e backup.',
              icon: '🗃️', src: 'atividades/redes-armazenamento-pratica.html',
              progressKey: 'redes_armazenamento_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    { key: 'internet-das-coisas', label: 'Internet das Coisas', trilhas: [] },
    { key: 'intro-dev-projetos', label: 'Introdução de Desenvolvimento de Projetos', trilhas: [] },
    { key: 'modelagem-sistemas-1', label: 'Modelagem de Sistemas 1', trilhas: [] },
    { key: 'mundo-trabalho', label: 'Mundo do Trabalho', trilhas: [] },
    { key: 'projeto-vida', label: 'Projeto de Vida', trilhas: [] },
    { key: 'prog-aplicativos', label: 'Programação de Aplicativos', trilhas: [] }
  ],

  // Insígnias da trilha "Curso de Desenvolvimento de Sistemas" (ver aba
  // Perfil, só aluno). Progressivas por % geral de conclusão
  // (student_module_progress) — minPct:0 é tratada à parte em platform-
  // core.js (exige progresso real, não só "0% arredondado"). Sem tabela
  // nova no Supabase: é só uma leitura derivada do progresso já sincronizado.
  insignias: [
    { key: 'iniciante', label: 'Iniciante', desc: 'Começou sua jornada no universo da programação!', icon: '💻', minPct: 0 },
    { key: 'logico', label: 'Lógico', desc: 'Entendeu a lógica e escreveu seus primeiros códigos!', icon: '🧩', minPct: 20 },
    { key: 'desenvolvedor', label: 'Desenvolvedor', desc: 'Construiu soluções e deu vida às suas ideias!', icon: '🗄️', minPct: 40 },
    { key: 'arquiteto', label: 'Arquiteto', desc: 'Organizou ideias e criou sistemas estruturados!', icon: '🖥️', minPct: 60 },
    { key: 'inovador', label: 'Inovador', desc: 'Aplicou boas práticas e levou seu código para outro nível!', icon: '☁️', minPct: 80 },
    { key: 'guardiao-do-codigo', label: 'Guardião do Código', desc: 'Escreve com excelência, pensa no futuro e faz a diferença!', icon: '🛡️', minPct: 100 }
  ]
};
