import { Routes } from '@angular/router';
import { authGuard, perfilGuard, publicGuard } from './core/auth/auth.guard';
import { masterGuard, masterPublicGuard } from './core/master/master.guard';

export const routes: Routes = [
  // ===== ROTAS MASTER =====
  {
    path: 'master',
    children: [
      {
        path: 'login',
        canActivate: [masterPublicGuard],
        loadComponent: () =>
          import('./features/master/login/master-login.component').then(
            (m) => m.MasterLoginComponent
          ),
      },
      {
        path: '',
        canActivate: [masterGuard],
        loadComponent: () =>
          import('./shared/components/master-shell/master-shell.component').then(
            (m) => m.MasterShellComponent
          ),
        children: [
          {
            path: 'tenants',
            loadComponent: () =>
              import('./features/master/tenants/tenants.component').then(
                (m) => m.TenantsComponent
              ),
          },
          { path: '', redirectTo: 'tenants', pathMatch: 'full' },
        ],
      },
    ],
  },

  // ===== ROTAS PÚBLICAS =====
  {
    path: 'login',
    canActivate: [publicGuard],
    loadComponent: () =>
      import('./features/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'cardapio',
    loadComponent: () =>
      import('./features/cardapio/cardapio.component').then((m) => m.CardapioComponent),
  },

  // Rotas autenticadas — envolvidas pelo ShellComponent (sidebar + topbar)
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./shared/components/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      // Garçom
      {
        path: 'garcom',
        canActivate: [perfilGuard(['garcom', 'admin'])],
        children: [
          {
            path: 'mesas',
            loadComponent: () =>
              import('./features/garcom/mesas/mesas.component').then((m) => m.MesasComponent),
          },
          {
            path: 'mesa/:mesaId/comandas',
            loadComponent: () =>
              import('./features/garcom/comanda/mesa-comandas.component').then(
                (m) => m.MesaComandasComponent
              ),
          },
          {
            path: 'comanda/:id',
            loadComponent: () =>
              import('./features/garcom/comanda/comanda-detalhe.component').then(
                (m) => m.ComandaDetalheComponent
              ),
          },
          { path: '', redirectTo: 'mesas', pathMatch: 'full' },
        ],
      },

      // Cozinha
      {
        path: 'cozinha',
        canActivate: [perfilGuard(['cozinha', 'admin'])],
        children: [
          {
            path: 'fila',
            loadComponent: () =>
              import('./features/cozinha/fila/fila.component').then((m) => m.FilaComponent),
          },
          { path: '', redirectTo: 'fila', pathMatch: 'full' },
        ],
      },

      // Caixa
      {
        path: 'caixa',
        canActivate: [perfilGuard(['caixa', 'admin'])],
        children: [
          {
            path: 'comandas',
            loadComponent: () =>
              import('./features/caixa/comandas/comandas-lista.component').then(
                (m) => m.ComandasListaComponent
              ),
          },
          {
            path: 'comanda/:id',
            loadComponent: () =>
              import('./features/caixa/comanda/comanda-detalhe-caixa.component').then(
                (m) => m.ComandaDetalheCaixaComponent
              ),
          },
          {
            path: 'fluxo-caixa',
            loadComponent: () =>
              import('./features/caixa/fluxo-caixa/fluxo-caixa-lista.component').then(
                (m) => m.FluxoCaixaListaComponent
              ),
          },
          {
            path: 'fluxo-caixa/:id',
            loadComponent: () =>
              import('./features/caixa/fluxo-caixa/fluxo-caixa-detalhe.component').then(
                (m) => m.FluxoCaixaDetalheComponent
              ),
          },
          { path: '', redirectTo: 'comandas', pathMatch: 'full' },
        ],
      },

      // Admin
      {
        path: 'admin',
        canActivate: [perfilGuard(['admin'])],
        children: [
          {
            path: 'dashboard',
            loadComponent: () =>
              import('./features/admin/dashboard/dashboard.component').then(
                (m) => m.DashboardComponent
              ),
          },
          {
            path: 'produtos',
            loadComponent: () =>
              import('./features/admin/produtos/produtos.component').then(
                (m) => m.ProdutosComponent
              ),
          },
          {
            path: 'categorias',
            loadComponent: () =>
              import('./features/admin/categorias/categorias.component').then(
                (m) => m.CategoriasComponent
              ),
          },
          {
            path: 'mesas',
            loadComponent: () =>
              import('./features/admin/mesas/admin-mesas.component').then(
                (m) => m.AdminMesasComponent
              ),
          },
          {
            path: 'usuarios',
            loadComponent: () =>
              import('./features/admin/usuarios/usuarios.component').then(
                (m) => m.UsuariosComponent
              ),
          },
          {
            path: 'relatorios',
            loadComponent: () =>
              import('./features/admin/relatorios/relatorios.component').then(
                (m) => m.RelatoriosComponent
              ),
          },
          { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
        ],
      },
    ],
  },

  // Redirects
  { path: '**', redirectTo: 'login' },
];
