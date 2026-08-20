// Matérias/trilhas/módulos da turma Jogos Digitais (6 matérias no total).
// Consumido por plataforma.html (via window.TURMA_CONFIG) — inclusive pela
// aba "Gestão" do próprio portal (shared/platform-core.js), que lê isso
// pra montar as colunas de desempenho por trilha do relatório de notas e a
// lista de aulas com geração de slides (campo hasSlides).
//
// Só dentro de uma matéria é que as trilhas aparecem (ver renderMaterias/
// openMateria em shared/platform-core.js). Fundamentos de Programação e
// Introdução ao Desenvolvimento de Projetos já têm conteúdo de verdade —
// as demais são placeholders prontos pra receber trilhas quando o
// currículo de cada uma for definido.
window.TURMA_CONFIG_JOGOS = {
  id: 'jogos',
  label: 'Jogos Digitais',
  materias: [
    {
      key: 'projeto-vida', label: 'Projeto de Vida',
      trilhas: [
        {
          key: 'vida-autoconhecimento',
          label: 'Autoconhecimento e Valores Pessoais',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre motivadores, talentos, habilidades, competências, aptidões e valores pessoais.',
          capacidade: 'Identificar características pessoais próprias tendo em vista o autoconhecimento.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Autoconhecimento e Valores Pessoais',
              desc: 'Motivadores pessoais/profissionais, valores e crenças, talento x habilidade x competência, aptidões, forças/oportunidades de desenvolvimento e correlação entre valores e sucesso profissional.',
              icon: '🦉', src: 'atividades/vida-autoconhecimento-teoria.html',
              progressKey: 'vida_autoconhecimento_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Autoconhecimento',
              desc: 'Resolva pareceres identificando motivadores, talentos, habilidades, competências e aptidões em cada cenário.',
              icon: '🔥', src: 'atividades/vida-autoconhecimento-pratica.html',
              progressKey: 'vida_autoconhecimento_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'vida-cidadania',
          label: 'Cidadania e Convivência Social',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre urbanidade, direitos e deveres individuais/coletivos e valores na tomada de decisão.',
          capacidade: 'Identificar normas e valores sociais relevantes à convivência cidadã.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Cidadania e Convivência Social',
              desc: 'Urbanidade, direitos e deveres individuais e coletivos, respeito à diversidade de valores/crenças e sua influência na tomada de decisão.',
              icon: '🦉', src: 'atividades/vida-cidadania-teoria.html',
              progressKey: 'vida_cidadania_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Cidadania',
              desc: 'Resolva pareceres identificando urbanidade, direitos/deveres individuais e coletivos em cada cenário.',
              icon: '🚌', src: 'atividades/vida-cidadania-pratica.html',
              progressKey: 'vida_cidadania_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'vida-emocional',
          label: 'Inteligência Emocional e Relacionamentos',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre autocontrole, adaptabilidade, empatia, feedback e networking.',
          capacidade: 'Identificar as habilidades socioemocionais que impactam nos relacionamentos interpessoais / Avaliar o impacto de atitudes e comportamentos próprios com relação às demais pessoas.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Inteligência Emocional e Relacionamentos',
              desc: 'Autocontrole, adaptabilidade/flexibilidade emocional, empatia e comportamento, feedback com inteligência emocional e redes de relacionamento (networking).',
              icon: '🦉', src: 'atividades/vida-emocional-teoria.html',
              progressKey: 'vida_emocional_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Inteligência Emocional',
              desc: 'Resolva pareceres identificando autocontrole, adaptabilidade, empatia, feedback e networking em cada cenário.',
              icon: '😤', src: 'atividades/vida-emocional-pratica.html',
              progressKey: 'vida_emocional_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'vida-equipe',
          label: 'Colaboração e Compromisso em Equipe',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre colaboração, definição de papéis, compromisso com metas, comunicação e integração do trabalho em equipe.',
          capacidade: 'Reconhecer as características do trabalho em equipe de forma colaborativa.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Colaboração e Compromisso em Equipe',
              desc: 'Colaboração e cooperação, definição de papéis, compromisso com objetivos e metas, comunicação em equipe e integração do trabalho colaborativo.',
              icon: '🦉', src: 'atividades/vida-equipe-teoria.html',
              progressKey: 'vida_equipe_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Projeto de Vida: Colaboração em Equipe',
              desc: 'Resolva pareceres identificando papéis, compromisso, comunicação e integração do trabalho em equipe em cada cenário.',
              icon: '🎪', src: 'atividades/vida-equipe-pratica.html',
              progressKey: 'vida_equipe_pratica_progress_', progressTotal: 5,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'mundo-trabalho', label: 'Mundo do Trabalho',
      trilhas: [
        {
          key: 'mundo-revolucao',
          label: 'Revoluções Industriais e Indústria 4.0',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre as quatro revoluções industriais e as tecnologias habilitadoras da Indústria 4.0.',
          capacidade: 'Reconhecer os marcos que alavancaram as revoluções industriais e seus impactos nas atividades de produção e no desenvolvimento do indivíduo / Reconhecer as tecnologias habilitadoras para indústria 4.0.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Revoluções Industriais e Indústria 4.0',
              desc: '1ª, 2ª, 3ª e 4ª Revolução Industrial, impactos econômicos/sociais e tecnologias habilitadoras: nuvem, IoT, manufatura digital/aditiva, robótica, big data, segurança digital e integração de sistemas.',
              icon: '🤖', src: 'atividades/mundo-revolucao-teoria.html',
              progressKey: 'mundo_revolucao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Mundo do Trabalho: Revoluções Industriais',
              desc: 'Resolva pareceres identificando a revolução industrial ou a tecnologia habilitadora certa em cada cenário.',
              icon: '⚙️', src: 'atividades/mundo-revolucao-pratica.html',
              progressKey: 'mundo_revolucao_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'mundo-inovacao',
          label: 'Inovação e Resolução de Problemas',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre inovação, melhoria contínua, raciocínio lógico e resolução criativa de problemas do cotidiano.',
          capacidade: 'Reconhecer a inovação como ferramenta de melhoria / Resolver problemas do cotidiano de forma criativa e inovadora.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Inovação e Resolução de Problemas',
              desc: 'O que é inovação de verdade, melhoria contínua, raciocínio indutivo/dedutivo aplicado ao cotidiano, lógica de programação com Arduino e raciocínio hipotético/inferencial no debugging.',
              icon: '🤖', src: 'atividades/mundo-inovacao-teoria.html',
              progressKey: 'mundo_inovacao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Mundo do Trabalho: Inovação',
              desc: 'Resolva pareceres identificando inovação, melhoria contínua e o raciocínio certo pra cada problema do cotidiano.',
              icon: '💡', src: 'atividades/mundo-inovacao-pratica.html',
              progressKey: 'mundo_inovacao_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'mundo-equipe',
          label: 'Trabalho em Equipe e Colaboração',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre colaboração, liderança, gestão de conflitos, empatia e flexibilidade.',
          capacidade: 'Atuar em equipes de forma colaborativa.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Trabalho em Equipe e Colaboração',
              desc: 'Colaboração e cooperação, liderança que apoia o time, gestão de conflitos construtiva, empatia com escuta ativa e flexibilidade diante de mudanças.',
              icon: '🤖', src: 'atividades/mundo-equipe-teoria.html',
              progressKey: 'mundo_equipe_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central do Mundo do Trabalho: Trabalho em Equipe',
              desc: 'Resolva pareceres identificando a atitude certa de colaboração, liderança e gestão de conflitos em cada cenário.',
              icon: '🤝', src: 'atividades/mundo-equipe-pratica.html',
              progressKey: 'mundo_equipe_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'intro-dev-projetos', label: 'Introdução ao Desenvolvimento de Projetos',
      trilhas: [
        {
          key: 'projetos-metodos',
          label: 'Métodos e Estratégias de Desenvolvimento',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre métodos indutivo/dedutivo, hipotético-dedutivo, dialético e postura investigativa.',
          capacidade: 'Reconhecer diferentes métodos aplicados ao desenvolvimento do projeto.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Métodos e Estratégias de Desenvolvimento',
              desc: 'Métodos indutivo/dedutivo, hipotético-dedutivo e dialético, estratégias de resolução de problema, IA como apoio e postura investigativa/diagnóstico.',
              icon: '🦈', src: 'atividades/projetos-metodos-teoria.html',
              progressKey: 'projetos_metodos_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Projetos: Métodos e Estratégias',
              desc: 'Resolva pareceres identificando o método ou estratégia aplicada em cada cenário.',
              icon: '🧭', src: 'atividades/projetos-metodos-pratica.html',
              progressKey: 'projetos_metodos_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'projetos-fases',
          label: 'Fases de Elaboração de um Projeto',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre concepção, pesquisa de anterioridade, planejamento, viabilidade e execução de projetos.',
          capacidade: 'Reconhecer as diferentes fases pertinentes à elaboração de um projeto.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Fases de Elaboração de um Projeto',
              desc: 'Concepção/ideação, pesquisa de anterioridade, registros e patentes, fundamentação e planejamento, viabilidade técnica/financeira e execução.',
              icon: '🦈', src: 'atividades/projetos-fases-teoria.html',
              progressKey: 'projetos_fases_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Projetos: Fases de um Projeto',
              desc: 'Resolva pareceres identificando a fase certa do projeto em cada cenário.',
              icon: '📌', src: 'atividades/projetos-fases-pratica.html',
              progressKey: 'projetos_fases_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'codificacao-jogos', label: 'Codificação de Jogos',
      trilhas: [
        {
          key: 'cod-ide',
          label: 'Instalação e Configuração da IDE',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre o que é uma IDE, instalação, variáveis de ambiente, extensões e o teste "Hello World".',
          capacidade: 'Reconhecer os procedimentos de instalação e configuração do ambiente de desenvolvimento (IDE) / Executar instalação e configuração da IDE (VSCode).',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Instalação e Configuração da IDE',
              desc: 'O que é uma IDE, instalação do VSCode, variáveis de ambiente (PATH), extensões e o teste básico "Hello World".',
              icon: '🐞', src: 'atividades/cod-ide-teoria.html',
              progressKey: 'cod_ide_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Instalação e Configuração da IDE',
              desc: 'Resolva pareceres sobre IDE, instalação, variáveis de ambiente, extensões e o teste inicial.',
              icon: '🧰', src: 'atividades/cod-ide-pratica.html',
              progressKey: 'cod_ide_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'cod-linguagens',
          label: 'Linguagens, Dados e GDD',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre C#/GDScript/C++, formatos de dados, GDD e pipeline de renderização.',
          capacidade: 'Reconhecer as linguagens de programação utilizadas no desenvolvimento de jogos / Reconhecer diferentes tipos e formatos de dados e arquivos / Reconhecer especificações técnicas definidas no projeto (GDD) / Reconhecer o processo de renderização de elementos multimídia.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Linguagens, Dados e GDD',
              desc: 'C#, GDScript e C++, formatos de dados (JSON/XML/binário), requisitos funcionais/não funcionais do GDD, pré-produção/produção e pipeline de renderização.',
              icon: '🐞', src: 'atividades/cod-linguagens-teoria.html',
              progressKey: 'cod_linguagens_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Linguagens, Dados e GDD',
              desc: 'Escreva código de verdade: manipule dados JSON, valide requisitos do GDD e calcule orçamento de assets do pipeline de renderização.',
              icon: '🐍', src: 'atividades/cod-linguagens-pratica.html',
              progressKey: 'cod_linguagens_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true, codeEditor: true
            }
          ]
        },
        {
          key: 'cod-seguranca-debug',
          label: 'Segurança da Informação e Debugging',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre os pilares CID, permissões de acesso, Watch/Call Stack e manipulação de dados externos.',
          capacidade: 'Reconhecer os pilares e os níveis hierárquicos de segurança da informação / Reconhecer e aplicar processos de depuração (debugging) e tratamento de erros / Aplicar técnicas de conversão e manipulação de dados e arquivos externos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Segurança da Informação e Debugging',
              desc: 'Pilares CID (Confidencialidade, Integridade, Disponibilidade), permissões de acesso, ferramentas Watch e Call Stack do debugger, e manipulação de dados externos sem recompilar.',
              icon: '🐞', src: 'atividades/cod-seguranca-debug-teoria.html',
              progressKey: 'cod_seguranca_debug_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Segurança e Debugging',
              desc: 'Escreva código de verdade: valide permissões, trate erros com segurança e manipule dados externos sem quebrar o jogo.',
              icon: '🔐', src: 'atividades/cod-seguranca-debug-pratica.html',
              progressKey: 'cod_seguranca_debug_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true, codeEditor: true
            }
          ]
        },
        {
          key: 'cod-poo',
          label: 'POO, Componentes e Multimídia',
          desc: 'Aprenda a teoria e depois escreva código de verdade sobre classes/instâncias, encapsulamento, componentes desacoplados, frameworks e triggers.',
          capacidade: 'Aplicar técnicas e métodos de desenvolvimento utilizando Programação Orientada a Objetos (POO) e Programação Orientada a Componentes / Aplicar linguagem de programação no uso de frameworks e integração multimídia.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — POO, Componentes e Multimídia',
              desc: 'Classes e instâncias, encapsulamento, Programação Orientada a Componentes, frameworks/documentação técnica e triggers de integração multimídia.',
              icon: '🐞', src: 'atividades/cod-poo-teoria.html',
              progressKey: 'cod_poo_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: POO, Componentes e Multimídia',
              desc: 'Escreva funções e classes JS de verdade, rodando contra casos de teste: instâncias, encapsulamento, componentes, herança e triggers.',
              icon: '👾', src: 'atividades/cod-poo-pratica.html',
              progressKey: 'cod_poo_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true, codeEditor: true
            }
          ]
        },
        {
          key: 'cod-agil-clean',
          label: 'Metodologia Ágil e Clean Code',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre Kanban, live coding, DRY, refatoração/modularização e documentação técnica.',
          capacidade: 'Aplicar metodologias ágeis e resolução de problemas técnicos / Aplicar boas práticas de desenvolvimento (Clean Code) e documentação de projetos com rastreabilidade.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Metodologia Ágil e Clean Code',
              desc: 'Sprint e quadro Kanban, live coding colaborativo, princípio DRY, refatoração/modularização e docstrings de documentação técnica.',
              icon: '🐞', src: 'atividades/cod-agil-clean-teoria.html',
              progressKey: 'cod_agil_clean_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Metodologia Ágil e Clean Code',
              desc: 'Escreva código de verdade aplicando Clean Code: elimine repetição (DRY), nomeie constantes e refatore sem quebrar o comportamento.',
              icon: '📋', src: 'atividades/cod-agil-clean-pratica.html',
              progressKey: 'cod_agil_clean_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true, codeEditor: true
            }
          ]
        },
        {
          key: 'cod-seguranca-ia',
          label: 'Segurança no Código e IA com Grafos',
          desc: 'Aprenda a teoria e depois resolva pareceres sobre validação de inputs, grafos de waypoints, algoritmos de busca, árvores de decisão e máquinas de estado.',
          capacidade: 'Aplicar boas práticas de segurança da informação no código / Aplicar estruturas de dados avançadas (Grafos e Árvores de Decisão) para lógica e IA.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Segurança no Código e IA com Grafos',
              desc: 'Validação de inputs contra injeções maliciosas, grafos de waypoints, algoritmos de busca em grafos, árvores de decisão e máquinas de estado pra IA de NPCs.',
              icon: '🐞', src: 'atividades/cod-seguranca-ia-teoria.html',
              progressKey: 'cod_seguranca_ia_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Codificação: Segurança no Código e IA com Grafos',
              desc: 'Escreva código de verdade: valide inputs, navegue grafos de waypoints e programe a decisão/estado de um NPC.',
              icon: '🕸️', src: 'atividades/cod-seguranca-ia-pratica.html',
              progressKey: 'cod_seguranca_ia_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true, codeEditor: true
            }
          ]
        }
      ]
    },
    {
      key: 'fundamentos-programacao',
      label: 'Fundamentos de Programação de Jogos',
      trilhas: [
        {
          key: 'fund-ambiente',
          label: 'Ambiente e Ferramentas de Desenvolvimento',
          desc: 'Aprenda a teoria e depois resolva chamados sobre instalação, engines, editor/compilador e bibliotecas.',
          capacidade: 'Reconhecer os procedimentos de preparação de ambiente de programação / Reconhecer as diferentes linguagens de programação utilizadas conforme a plataforma do jogo a ser produzido.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Ambiente e Ferramentas de Desenvolvimento',
              desc: 'O que compõe um jogo 2D, instalação do ambiente, engines, editor x compilador, linguagem por plataforma e bibliotecas de apoio.',
              icon: '🦈', src: 'atividades/fund-ambiente-teoria.html',
              progressKey: 'fund_ambiente_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Suporte: Ambiente e Ferramentas',
              desc: 'Resolva chamados escolhendo a plataforma, ferramenta ou biblioteca certa pra cada cenário.',
              icon: '🛠️', src: 'atividades/fund-ambiente-pratica.html',
              progressKey: 'fund_ambiente_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'fund-logica',
          label: 'Lógica e Algoritmos para Jogos 2D',
          desc: 'Aprenda a teoria e depois resolva chamados sobre game loop, coordenadas, cenário, cores e física básica.',
          capacidade: 'Reconhecer técnicas e algoritmos utilizados na programação de elementos em jogos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Lógica e Algoritmos para Jogos 2D',
              desc: 'Game loop, sistema de coordenadas 2D, cenário como matriz de tiles, sistema de cores (RGBA) e física básica (gravidade, colisão).',
              icon: '🦈', src: 'atividades/fund-logica-teoria.html',
              progressKey: 'fund_logica_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Suporte: Lógica e Algoritmos',
              desc: 'Escreva código de verdade: coordenadas, matriz de cenário, mistura de cor e física básica de jogo.',
              icon: '🧮', src: 'atividades/fund-logica-pratica.html',
              progressKey: 'fund_logica_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true, codeEditor: true
            }
          ]
        },
        {
          key: 'fund-prog2d',
          label: 'Programação de Jogos 2D na Prática',
          desc: 'Aprenda a teoria e depois resolva chamados sobre movimentação, colisão, eventos e ciclo de vida de objetos.',
          capacidade: 'Utilizar linguagem de programação para desenvolvimento de jogos digitais 2D.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Programação de Jogos 2D na Prática',
              desc: 'Movimentação com teclado e mouse, colisores, fluxo de eventos, estrutura do código e criação/atualização/remoção de objetos.',
              icon: '🦈', src: 'atividades/fund-prog2d-teoria.html',
              progressKey: 'fund_prog2d_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Suporte: Programação de Jogos 2D',
              desc: 'Escreva código de verdade: movimentação, colisão, eventos e controle de objetos do jogo.',
              icon: '🕹️', src: 'atividades/fund-prog2d-pratica.html',
              progressKey: 'fund_prog2d_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true, codeEditor: true
            }
          ]
        },
        {
          key: 'fund-multimidia',
          label: 'Multimídia e Versionamento',
          desc: 'Aprenda a teoria e depois resolva chamados sobre sprites, assets, áudio e versionamento de código.',
          capacidade: 'Reconhecer os processos de integração de elementos de multimídia / Reconhecer métodos de versionamento aplicados na produção de jogos.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Multimídia e Versionamento',
              desc: 'Inserção de sprites, organização de assets gráficos, integração de áudio e versionamento de código com Git.',
              icon: '🦈', src: 'atividades/fund-multimidia-teoria.html',
              progressKey: 'fund_multimidia_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de Suporte: Multimídia e Versionamento',
              desc: 'Resolva chamados de sprites, organização de assets, áudio e versionamento com Git.',
              icon: '🎬', src: 'atividades/fund-multimidia-pratica.html',
              progressKey: 'fund_multimidia_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'js',
          label: 'JavaScript',
          desc: 'Escolha um módulo de desafios para praticar.',
          modules: [
            {
              key: 'basico', title: 'Básico — Desafios de JavaScript',
              desc: 'Vença cada adversário em ordem para avançar. Derrotar um duelo libera o próximo.',
              icon: '🟨', src: 'atividades/js-basico.html',
              progressKey: 'js_basico_progress_', progressTotal: 10,
              hasGabarito: true
            },
            {
              key: 'intermediario', title: 'Intermediário — Desafios de JavaScript',
              desc: 'Vença cada adversário em ordem para avançar. Derrotar um duelo libera o próximo.',
              icon: '🟧', src: 'atividades/js-intermediario.html',
              progressKey: 'js_intermediario_progress_', progressTotal: 10,
              hasGabarito: true
            }
          ]
        },
        {
          key: 'csharp',
          label: 'C#',
          desc: 'Escolha um módulo para começar.',
          capacidade: 'Reconhecer a origem, o propósito e a sintaxe básica da linguagem C# (variáveis, tipos de dados, comandos de saída e comentários).',
          modules: [
            {
              key: 'basico', title: 'Básico — A Jornada do Eri',
              desc: 'Primeiro contato com C#, contado em forma de história. Responda cada pergunta para avançar.',
              icon: '🦈', src: 'atividades/csharp-basico.html',
              progressKey: 'csharp_basico_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            }
          ]
        }
      ]
    },
    {
      key: 'testes-jogos', label: 'Testes de Jogos Digitais',
      trilhas: [
        {
          key: 'teste-fundamentos',
          label: 'Fundamentos e Níveis de Teste',
          desc: 'Aprenda a teoria e depois resolva chamados sobre tipos de teste, técnicas caixa-preta/caixa-branca e níveis de Unidade a Aceitação.',
          capacidade: 'Identificar tipos, função, ferramentas de teste de acordo com o sistema de jogos digitais / Reconhecer normas, métodos e técnicas de testes para correção de falhas de sistema.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Fundamentos e Níveis de Teste',
              desc: 'Conceito de teste de jogos, processo fundamental, tipos (Funcionalidade, Confiabilidade, Desempenho, Manutenibilidade), técnicas caixa-preta/caixa-branca, níveis (Unidade, Integração, Sistema, Aceitação) e comunicação não violenta ao reportar bugs.',
              icon: '🔍', src: 'atividades/teste-fundamentos-teoria.html',
              progressKey: 'teste_fundamentos_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de QA: Fundamentos e Níveis de Teste',
              desc: 'Resolva chamados classificando tipo, técnica e nível de teste em cada cenário.',
              icon: '🧪', src: 'atividades/teste-fundamentos-pratica.html',
              progressKey: 'teste_fundamentos_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'teste-planejamento',
          label: 'Planejamento de Testes',
          desc: 'Aprenda a teoria e depois resolva chamados sobre escopo, critérios de aceite, casos de teste, cronograma, teste de mesa, priorização e rastreabilidade.',
          capacidade: 'Analisar documentação de teste para planejamento da rotina / Reconhecer os elementos de um plano de testes.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Planejamento de Testes',
              desc: 'Escopo, critérios de aceite, casos de teste, cronograma e responsáveis, teste de mesa, priorização, rastreabilidade, comunicação não violenta e plano de testes como documento vivo.',
              icon: '🔍', src: 'atividades/teste-planejamento-teoria.html',
              progressKey: 'teste_planejamento_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de QA: Planejamento de Testes',
              desc: 'Resolva chamados identificando qual peça do plano de testes está faltando em cada cenário da PixelForge.',
              icon: '📋', src: 'atividades/teste-planejamento-pratica.html',
              progressKey: 'teste_planejamento_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        },
        {
          key: 'teste-execucao',
          label: 'Execução de Testes por Versão',
          desc: 'Aprenda a teoria e depois resolva chamados sobre o ciclo Alfa/Beta/Release Candidate/Gold, frameworks de teste, ambiente de testes, roteiro de execução e critério de avanço.',
          capacidade: 'Desenvolver plano de testes / Organizar o ambiente para o desenvolvimento das rotinas de testes / Definir roteiro de teste para execução, conforme recomendações técnicas.',
          modules: [
            {
              key: 'teoria', title: 'Teoria — Execução de Testes por Versão',
              desc: 'Ciclo Alfa → Beta → Release Candidate → Gold, frameworks de teste, ambiente de testes separado da produção, roteiro de execução reproduzível, reteste e critério de avanço entre fases.',
              icon: '🔍', src: 'atividades/teste-execucao-teoria.html',
              progressKey: 'teste_execucao_teoria_progress_', progressMode: 'flag',
              hasSlides: true, hasGabarito: true
            },
            {
              key: 'pratica', title: 'Prática — Central de QA: Execução de Testes por Versão',
              desc: 'Resolva chamados identificando a fase do ciclo de versão, frameworks de teste, roteiro de execução, reteste e critério de avanço em cada cenário.',
              icon: '🚀', src: 'atividades/teste-execucao-pratica.html',
              progressKey: 'teste_execucao_pratica_progress_', progressTotal: 10,
              requires: 'teoria', hasGabarito: true
            }
          ]
        }
      ]
    }
  ],

  // Insígnias da trilha "Curso de Jogos Digitais" (ver aba Perfil, só
  // aluno). Progressivas por % geral de conclusão (student_module_progress)
  // — minPct:0 é tratada à parte em platform-core.js (exige progresso real,
  // não só "0% arredondado"). Sem tabela nova no Supabase: é só uma leitura
  // derivada do progresso que já é sincronizado.
  insignias: [
    { key: 'iniciante', label: 'Iniciante', desc: 'Deu o primeiro passo no mundo dos jogos!', icon: '🚀', minPct: 0 },
    { key: 'explorador', label: 'Explorador', desc: 'Explorou novas ferramentas e mecânicas!', icon: '💚', minPct: 20 },
    { key: 'criador', label: 'Criador', desc: 'Criou seu primeiro jogo do começo ao fim!', icon: '🎮', minPct: 40 },
    { key: 'desafiador', label: 'Desafiador', desc: 'Superou desafios e levou suas habilidades além!', icon: '🏆', minPct: 60 },
    { key: 'mestre-dos-jogos', label: 'Mestre dos Jogos', desc: 'Domina as mecânicas e pensa como um Game Designer!', icon: '⚔️', minPct: 80 },
    { key: 'lendario', label: 'Lendário', desc: 'Criatividade, técnica e paixão pelos jogos em outro nível!', icon: '🐉', minPct: 100 }
  ]
};
