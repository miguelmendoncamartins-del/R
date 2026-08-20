const MOCK_NODES = {
  "192.168.1.10": {
    email: "breno.silva80",
    jdcoin: 1234.80,
    lockedFolders: [],
    folders: {
      fotos: [{ name: "foto_perfil.png", content: "[IMAGEM SIMULADA: PERFIL_RUST.PNG]" }],
      whatsapp: [{ name: "chat_grupo.txt", content: "Breno: Deixei o backup da wallet no commit 8a2f1c, tomara que ninguém ache." }],
      instagram: [{ name: "directs.json", content: '{"session_token": "ig_token_9981_breno"}' }],
      tiktok: [{ name: "drafts.db", content: "video_rascunho_gameplay.mp4" }],
      jdcoin: [{ name: "wallet.dat", content: 'SEED: "alpha bravo charlie delta 2026" | HASH_COMMIT: 8a2f1c' }]
    }
  },
  "192.168.1.11": {
    email: "edward.guzman",
    jdcoin: 1580.11,
    lockedFolders: [],
    folders: {
      fotos: [{ name: "scan_doc.jpg", content: "[IMAGEM SIMULADA: RG_FRONTAL.JPG]" }],
      whatsapp: [{ name: "backup_chat.txt", content: "Edward: Minha chave de sessão do TikTok vazou na branch feature-backup." }],
      instagram: [{ name: "directs.json", content: '{"chat": "Gabi, me manda o token do JDCoin no privado"}' }],
      tiktok: [{ name: "session.key", content: "TIKTOK_SESSION_TOKEN=tk_live_99201827391" }],
      jdcoin: [{ name: "seed.txt", content: 'SEED: "solar flare cyber zumbi game 2026"' }]
    }
  },
  "192.168.1.12": {
    email: "engel.fraga",
    jdcoin: 2100.12,
    lockedFolders: [],
    folders: {
      fotos: [{ name: "prints.png", content: "[PRINTS DE CÓDIGO FONTE]" }],
      whatsapp: [{ name: "conversas.txt", content: "Engel: Mudei meu IP para o final .12, ninguém vai me achar aqui." }],
      instagram: [{ name: "session.json", content: '{"token": "ig_live_fraga_8821"}' }],
      tiktok: [{ name: "cache.tmp", content: "cache_videos_reels.tmp" }],
      jdcoin: [{ name: "wallet_backup.dat", content: 'SEED: "pixel forge studio dev team 2026"' }]
    }
  },
  "192.168.1.13": {
    email: "gabriella.borges5",
    jdcoin: 1420.13,
    lockedFolders: [],
    folders: {
      fotos: [{ name: "passaporte.png", content: "[DOCUMENTO_CONFIDENCIAL.PNG]" }],
      whatsapp: [{ name: "dump.txt", content: "Gabi: Criei uma branch secreta chamada feature-cofre." }],
      instagram: [{ name: "directs.json", content: '{"chat": "Anotou a seed do JDCoin?"}' }],
      tiktok: [{ name: "tokens.db", content: "tk_auth_gabriella_2026" }],
      jdcoin: [{ name: "seed.txt", content: 'SEED: "matrix neon cyber hack 2026"' }]
    }
  }
};