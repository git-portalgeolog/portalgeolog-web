const { Client } = require('pg');

async function enableRealtime() {
  const connectionString = "postgresql://postgres:AdminPGeolog@2026@db.hzpgfapvjwqtjclriisz.supabase.co:5432/postgres";
  const client = new Client({ connectionString });

  try {
    console.log('🔄 Conectando ao banco de dados Supabase...');
    await client.connect();
    console.log('✅ Conectado!');

    const sql = `
      BEGIN;
      -- 1. Garante que a publicação 'supabase_realtime' existe
      DO $$ 
      BEGIN 
        IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN 
          CREATE PUBLICATION supabase_realtime; 
        END IF; 
      END $$;

      -- 2. Define as tabelas que PERMITEM Realtime (sobrescreve a lista anterior para evitar erros de duplicidade)
      -- Usamos SET TABLE para definir exatamente a lista que queremos
      ALTER PUBLICATION supabase_realtime SET TABLE 
        clientes, 
        solicitantes, 
        ordens_servico, 
        centros_custo, 
        passageiros, 
        drivers, 
        tipos_servico;

      -- 3. Habilita o Realtime a nível de REPLICA (FULL permite ver o dado antigo e o novo no payload)
      -- Isso torna o sincronismo muito mais robusto
      ALTER TABLE clientes REPLICA IDENTITY FULL;
      ALTER TABLE solicitantes REPLICA IDENTITY FULL;
      ALTER TABLE ordens_servico REPLICA IDENTITY FULL;
      ALTER TABLE centros_custo REPLICA IDENTITY FULL;
      ALTER TABLE passageiros REPLICA IDENTITY FULL;
      ALTER TABLE drivers REPLICA IDENTITY FULL;
      ALTER TABLE tipos_servico REPLICA IDENTITY FULL;

      COMMIT;
    `;

    console.log('🚀 Executando comandos de ativação Realtime...');
    await client.query(sql);
    console.log('✨ REALTIME ATIVADO COM SUCESSO PARA TODAS AS TABELAS!');

  } catch (err) {
    console.error('❌ Erro ao ativar Realtime:', err.message);
    if (err.message.includes('password authentication failed')) {
      console.error('⚠️ A senha fornecida parece estar incorreta.');
    }
    process.exit(1);
  } finally {
    await client.end();
  }
}

enableRealtime();
