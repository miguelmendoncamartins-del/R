// Base única de usuários do portal — usada pelo login (index.html) e por
// professor/painel.html. Cada turma consome apenas os usuários com o seu
// próprio valor de `turma`; o professor enxerga todos.
//
// Para cadastrar uma turma nova: basta adicionar usuários aqui com um novo
// valor de `turma` e criar turmas/<nova-turma>/plataforma.html — nada aqui
// precisa mudar para as turmas existentes.
window.USERS_DB = [
  // ===== Turma: Jogos Digitais =====
  {"email": "breno.silva80", "senha": "silva2026", "nome": "Breno Silva", "role": "aluno", "turma": "jogos", "ip": "192.168.1.10", "saldo": "1234.80"},
  {"email": "edward.guzman", "senha": "guzman2026", "nome": "Edward Guzman", "role": "aluno", "turma": "jogos", "ip": "192.168.1.11", "saldo": "1580.11"},
  {"email": "engel.fraga", "senha": "fraga2026", "nome": "Engel Fraga", "role": "aluno", "turma": "jogos", "ip": "192.168.1.12", "saldo": "2100.12"},
  {"email": "gabriella.borges5", "senha": "borges2026", "nome": "Gabriella Borges", "role": "aluno", "turma": "jogos", "ip": "192.168.1.13", "saldo": "1420.13"},
  {"email": "iago.moreira", "senha": "carvalho2026", "nome": "Iago Moreira", "role": "aluno", "turma": "jogos", "ip": "192.168.1.14", "saldo": "3050.14"},
  {"email": "joao.schneider", "senha": "schneider2026", "nome": "João Schneider", "role": "aluno", "turma": "jogos", "ip": "192.168.1.15", "saldo": "1890.15"},
  {"email": "jose.lima8", "senha": "lima2026", "nome": "José Lima", "role": "aluno", "turma": "jogos", "ip": "192.168.1.16", "saldo": "1234.16"},
  {"email": "jose.rodrigues6", "senha": "rodrigues2026", "nome": "José Rodrigues", "role": "aluno", "turma": "jogos", "ip": "192.168.1.17", "saldo": "2740.17"},
  {"email": "josuel.santos", "senha": "santos2026", "nome": "Josuel Santos", "role": "aluno", "turma": "jogos", "ip": "192.168.1.18", "saldo": "1310.18"},
  {"email": "juliano.alves", "senha": "ferreira2026", "nome": "Juliano Alves", "role": "aluno", "turma": "jogos", "ip": "192.168.1.19", "saldo": "4200.19"},
  {"email": "leon.kacki", "senha": "kacki2026", "nome": "Leon Kacki", "role": "aluno", "turma": "jogos", "ip": "192.168.1.20", "saldo": "1950.20"},
  {"email": "maria.moura85", "senha": "moura2026", "nome": "Maria Moura", "role": "aluno", "turma": "jogos", "ip": "192.168.1.21", "saldo": "1670.21"},
  {"email": "maycongabriel.moreira", "senha": "moreira2026", "nome": "Maycon Gabriel Moreira", "role": "aluno", "turma": "jogos", "ip": "192.168.1.22", "saldo": "2300.22"},
  {"email": "miguelmendonca.martins", "senha": "martins2026", "nome": "Miguel Mendonça Martins", "role": "aluno", "turma": "jogos", "ip": "192.168.1.23", "saldo": "1234.23"},
  {"email": "murillo.lima", "senha": "lima2026", "nome": "Murillo Lima", "role": "aluno", "turma": "jogos", "ip": "192.168.1.24", "saldo": "1780.24"},
  {"email": "tiago.dias1", "senha": "dias2026", "nome": "Tiago Dias", "role": "aluno", "turma": "jogos", "ip": "192.168.1.25", "saldo": "2900.25"},
  {"email": "yasmim.rezende4", "senha": "rezende2026", "nome": "Yasmim Rezende", "role": "aluno", "turma": "jogos", "ip": "192.168.1.26", "saldo": "1490.26"},

  // ===== Turma: Sistemas =====
  {"email": "alexandre.natal", "senha": "natal2026", "nome": "Alexandre Natal", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.1", "saldo": "1183.50"},
  {"email": "amanda.silva32", "senha": "silva2026", "nome": "Amanda Silva", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.2", "saldo": "1367.00"},
  {"email": "ana.quevedo1", "senha": "quevedo2026", "nome": "Ana Quevedo", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.3", "saldo": "1550.50"},
  {"email": "anne.karoline", "senha": "silva2026", "nome": "Anne Karoline", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.4", "saldo": "1734.00"},
  {"email": "bianca.bernardi", "senha": "bernardi2026", "nome": "Bianca Bernardi", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.6", "saldo": "2101.00"},
  {"email": "bruno.gomes1", "senha": "gomes2026", "nome": "Bruno Gomes", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.7", "saldo": "2211.00"},
  {"email": "douglas.silva16", "senha": "silva2026", "nome": "Douglas Silva", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.8", "saldo": "2394.50"},
  {"email": "emilly.oliveira75", "senha": "oliveira2026", "nome": "Emilly Oliveira", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.9", "saldo": "2578.00"},
  {"email": "enzo.lopes4", "senha": "lopes2026", "nome": "Enzo Lopes", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.10", "saldo": "2761.50"},
  {"email": "erasmo.prado", "senha": "prado2026", "nome": "Erasmo Prado", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.11", "saldo": "2945.00"},
  {"email": "franciele.alencar", "senha": "alencar2026", "nome": "Franciele Alencar", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.12", "saldo": "3128.50"},
  {"email": "guilherme.almeida8", "senha": "almeida2026", "nome": "Guilherme Almeida", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.13", "saldo": "3312.00"},
  {"email": "guilherme.lima119", "senha": "lima2026", "nome": "Guilherme Lima", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.14", "saldo": "3422.00"},
  {"email": "gustavo.robson", "senha": "souza2026", "nome": "Gustavo Robson", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.15", "saldo": "3605.50"},
  {"email": "hebert.eduardo", "senha": "santos2026", "nome": "Hebert Eduardo", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.16", "saldo": "3789.00"},
  {"email": "isabella.prado", "senha": "prado2026", "nome": "Isabella Prado", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.17", "saldo": "3972.50"},
  {"email": "joao.sousa73", "senha": "sousa2026", "nome": "João Sousa", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.18", "saldo": "4156.00"},
  {"email": "jordanna.rocha", "senha": "rocha2026", "nome": "Jordanna Rocha", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.19", "saldo": "1139.50"},
  {"email": "kaila.jesus", "senha": "jesus2026", "nome": "Kaila Jesus", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.20", "saldo": "1323.00"},
  {"email": "kauan.sousa60", "senha": "sousa2026", "nome": "Kauan Sousa", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.21", "saldo": "1433.00"},
  {"email": "lauan.souza", "senha": "souza2026", "nome": "Lauan Souza", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.23", "saldo": "1800.00"},
  {"email": "luana.victoria", "senha": "ribeiro2026", "nome": "Luana Victoria", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.24", "saldo": "1983.50"},
  {"email": "moises.barros", "senha": "barros2026", "nome": "Moisés Barros", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.25", "saldo": "2167.00"},
  {"email": "nicole.santos21", "senha": "santos2026", "nome": "Nicole Santos", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.26", "saldo": "2350.50"},
  {"email": "vicente.ferreira", "senha": "neto2026", "nome": "Vicente Ferreira", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.27", "saldo": "2534.00"},
  {"email": "victor.teodoro", "senha": "nascimento2026", "nome": "Victor Teodoro", "role": "aluno", "turma": "sistemas", "ip": "192.168.2.28", "saldo": "2644.00"},

  // ===== Professor (acesso às duas turmas) =====
  {"email": "admin", "senha": "jd4532", "nome": "Instrutor / Professor", "role": "professor", "turma": "all", "ip": "192.168.1.254", "saldo": "9999.00"}
];
