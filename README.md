# Fluxo de Caixa Local

Painel de fluxo de caixa em reais para uso local. Acompanha os saldos das contas bancárias, as entradas e saídas e as despesas por etiqueta. A importação aceita OFX e CSV, registra um histórico, permite desfazer um lote e compara o saldo calculado com o fechamento do extrato.

## Demonstração online

[Abrir a demo no GitHub Pages](https://euandrexz.github.io/fluxo-de-caixa-local/).

A demo abre com contas e movimentações fictícias. Use **Importar extrato de exemplo** para testar a atualização de saldo, a conciliação e o histórico direto no navegador. As alterações ficam na aba até recarregar a página ou clicar em **Reiniciar demo**.

## Como usar

1. Baixe o [arquivo HTML](dist/Fluxo%20de%20Caixa%20Local.html) e abra no navegador.
2. Clique em **Sair da demonstração**. Vá em **Contas bancárias → Nova conta** e informe o nome, o banco e o saldo inicial. Use o saldo de fechamento do dia anterior ao primeiro lançamento que você vai importar e informe a data desse saldo.
3. Clique em **Importar extrato**, escolha a conta e selecione o OFX ou CSV. Confira a prévia e confirme. Quando o extrato não trouxer um saldo de fechamento, você pode informá-lo no formulário.
4. Use **Lançamentos** para editar a descrição, a pessoa, o motivo e as etiquetas. Em **Etiquetas**, você pode cadastrar regras de sugestão por palavra-chave.
5. Após revisar os lançamentos, vá em **Backup → Baixar backup** e guarde o JSON em local seguro. Para recuperar ou transferir os dados, use **Backup → Selecionar backup**.

Use o mesmo arquivo HTML no mesmo navegador no dia a dia. Os dados ficam no armazenamento do navegador e podem ser transferidos pelo backup.

## Desenvolvimento

O código fica em `src/` e roda no navegador com HTML, CSS e JavaScript. O Node.js é usado para gerar o arquivo autônomo e rodar as verificações. O painel em `dist/` abre diretamente no navegador.

```sh
node test/check.cjs
node scripts/build.cjs
```

O OFX em `test/fixtures/` usa dados fictícios para verificar a leitura do extrato e a conferência do saldo.

A compilação também gera a demo em `docs/index.html`. O GitHub Pages publica a pasta `docs/` da branch `main`.
