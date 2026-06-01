export default function SobrePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Sobre o projeto</h1>
        <p className="text-sm text-muted">Controle Financeiro — visão geral e guia de uso</p>
      </div>

      <div className="card p-6 space-y-4 text-sm leading-relaxed">
        <div>
          <h2 className="text-lg font-semibold mb-2">O que é</h2>
          <p>
            O Controle Financeiro é um aplicativo web para organizar receitas e despesas mensais, controlar compras em cartões de
            crédito (incluindo parcelas automáticas mês a mês) e acompanhar métricas e evolução de gastos por período.
          </p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Principais recursos</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li>Dashboard mensal com totais de receitas, despesas e saldo.</li>
            <li>Listas de receitas e despesas com criação, edição, exclusão e marcação de pagamento.</li>
            <li>Replicar receitas/despesas para o próximo mês com um clique.</li>
            <li>Exportação do mês para PDF com layout otimizado.</li>
            <li>Persistência local (localStorage) para manter seus dados no navegador.</li>
            <li>Cartões de crédito: cadastro de cartões, cores/identidade de banco e compras parceladas.</li>
            <li>Projeção automática de parcelas pelos meses seguintes e limpeza ao término.</li>
            <li>Dashboard por cartão no mês e gráfico de evolução dos gastos.</li>
            <li>Interface moderna, responsiva e intuitiva.</li>
          </ul>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Como usar — passo a passo</h2>
          <ol className="list-decimal pl-5 space-y-3 text-muted">
            <li>
              <span className="font-medium text-white">Controle mensal:</span>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Por padrão, o mês atual é exibido. Use as setas ao lado do título para avançar ou voltar meses.</li>
                <li>No dashboard você vê a soma de receitas, o total de despesas do mês e o saldo (pagas) e saldo previsto.</li>
                <li>Adicione receitas e despesas nos botões das respectivas colunas. Edite/exclua pelos ícones.</li>
                <li>Marque despesas como pagas para que sejam descontadas do saldo. É possível desfazer a ação.</li>
                <li>Use “Replicar para próximo mês” para copiar os lançamentos e “Exportar PDF” para gerar um relatório.</li>
              </ul>
            </li>
            <li>
              <span className="font-medium text-white">Cartões de crédito:</span>
              <ul className="list-disc pl-5 mt-1 space-y-1">
                <li>Cadastre seus cartões informando nome, banco e cor (sugerida automaticamente para bancos conhecidos).</li>
                <li>Cadastre compras parceladas vinculando um cartão, o nome da compra, total de parcelas, parcela atual e valor.</li>
                <li>Ao navegar de mês, as parcelas avançam automaticamente (ex.: 1/3, depois 2/3, depois 3/3).</li>
                <li>Quando todas as parcelas finalizam, a compra deixa de aparecer nos meses seguintes.</li>
                <li>Veja o total por cartão no mês, o total geral e o gráfico de evolução dos últimos meses.</li>
              </ul>
            </li>
          </ol>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Tecnologias</h2>
          <p className="text-muted">Next.js (App Router) + React + TypeScript + Tailwind CSS + Chart.js.</p>
        </div>

        <div>
          <h2 className="text-lg font-semibold mb-2">Dicas</h2>
          <ul className="list-disc pl-5 space-y-1 text-muted">
            <li>Os dados são salvos no seu navegador (localStorage). Limpar cache pode apagar os lançamentos.</li>
            <li>Para um backup rápido, gere um PDF mensal pelo botão “Exportar PDF”.</li>
            <li>Você pode ajustar as cores de cartões manualmente, mesmo com a sugestão do banco.</li>
          </ul>
        </div>
      </div>
    </div>
  );
}


