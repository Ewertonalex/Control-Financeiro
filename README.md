# Controle Financeiro

Aplicação web para controle mensal de receitas e despesas e gestão de gastos por cartões de crédito (com parcelas automáticas), construída com Next.js, React, TypeScript e Tailwind CSS.

## Funcionalidades
- Dashboard mensal: receitas, despesas (todas), saldo (pagas) e saldo previsto
- CRUD de receitas e despesas, com marcação de pagamento
- Replicar lançamentos para o próximo mês
- Exportar PDF do mês
- Persistência em localStorage
- Cartões de crédito: cadastro/edição/exclusão com cores por banco
- Compras parceladas com projeção automática por mês
- Totais por cartão no mês e total geral
- Gráfico de evolução (últimos meses)

## Tecnologias
- Next.js (App Router) + React + TypeScript
- Tailwind CSS
- Chart.js + react-chartjs-2
- date-fns
- html2canvas + jsPDF

## Como executar
```bash
npm install
npm run dev
# http://localhost:3000
```

## Guia de uso
### Controle mensal
1. Acesse “Controle mensal” (default: mês atual). Use as setas para navegar entre meses
2. Adicione receitas e despesas pelos botões de cada coluna
3. Edite/exclua pelos ícones; marque despesas como pagas para afetar o saldo
4. “Replicar para próximo mês” copia os lançamentos; “Exportar PDF” gera relatório do mês

### Cartões de crédito
1. Cadastre cartões (nome, banco e cor — cor sugerida automaticamente para bancos conhecidos)
2. Cadastre compras parceladas informando cartão, descrição, total de parcelas, parcela atual e valor da parcela
3. Ao navegar de mês, as parcelas avançam (1/n, 2/n, …); ao finalizar, a compra some dos próximos meses
4. Veja o total por cartão, total geral e o gráfico de evolução dos gastos

## Persistência
- Os dados são salvos no navegador (localStorage)
- Se os dados sumirem após navegação, certifique-se de não estar em janela anônima e de não limpar o storage

## Estrutura de pastas
- `src/app/` páginas e layout (App Router)
- `src/features/` módulos de domínio (mensal, cartões)
- `src/components/` componentes compartilhados (Sidebar, MobileNav)
- `src/styles/` estilos globais Tailwind (v4)

## Roadmap (ideias)
- Máscara de moeda e categorias
- Importação/exportação JSON
- Sincronização opcional com backend
- Autenticação (multi-dispositivo)

## Licença
MIT
