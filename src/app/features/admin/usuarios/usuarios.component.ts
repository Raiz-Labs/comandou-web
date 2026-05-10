import {
  Component,
  inject,
  signal,
  computed,
  resource,
} from '@angular/core';
import { Router } from '@angular/router';
import { AdminService, CriarUsuarioPayload } from '../admin.service';
import { ToastService } from '../../../shared/components/toast/toast.service';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { SkeletonComponent } from '../../../shared/components/skeleton/skeleton.component';
import { Usuario, Perfil } from '../../../shared/types';
import { LucideAngularModule } from 'lucide-angular';

interface UsuarioModel {
  nome: string;
  email: string;
  senha: string;
  perfil: Perfil | '';
}

const MODELO_VAZIO: UsuarioModel = { nome: '', email: '', senha: '', perfil: '' };

type Campo = keyof UsuarioModel;

const PERFIL_LABEL: Record<Perfil, string> = {
  garcom: 'Garçom',
  cozinha: 'Cozinha',
  caixa: 'Caixa',
  admin: 'Admin',
};

const PERFIS: Perfil[] = ['garcom', 'cozinha', 'caixa', 'admin'];

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

@Component({
  selector: 'app-usuarios',
  standalone: true,
  imports: [SkeletonComponent, ConfirmDialogComponent, LucideAngularModule],
  template: `
    <div class="layout">
      <!-- Topbar -->
      <header class="topbar">
        <button class="b-btn-back" (click)="router.navigateByUrl('/admin/dashboard')" aria-label="Voltar">
          <lucide-icon name="arrow-left" [size]="18" />
        </button>
        <h1 class="topbar__title">Usuários</h1>
        <button class="b-btn-primary btn-novo" (click)="abrirCriar()">
          <lucide-icon name="user-plus" [size]="16" />
          Novo usuário
        </button>
      </header>

      <!-- Toolbar -->
      <div class="toolbar">
        <div class="search-box">
          <lucide-icon name="search" [size]="15" color="var(--b-fg-subtle)" />
          <input class="search-input" type="search" placeholder="Buscar por nome ou e-mail..."
            [value]="busca()" (input)="busca.set($any($event.target).value)" autocomplete="off" />
          @if (busca()) {
            <button class="search-clear" (click)="busca.set('')" aria-label="Limpar">
              <lucide-icon name="x" [size]="13" />
            </button>
          }
        </div>
        <div class="filtro-tabs">
          <button class="filtro-tab" [class.filtro-tab--active]="filtroPerfil() === null" (click)="filtroPerfil.set(null)">Todos</button>
          @for (p of perfis; track p) {
            <button class="filtro-tab" [class.filtro-tab--active]="filtroPerfil() === p" (click)="filtroPerfil.set(p)">{{ perfilLabel(p) }}</button>
          }
        </div>
        <label class="toggle-inativos">
          <input type="checkbox" [checked]="mostrarInativos()" (change)="mostrarInativos.set($any($event.target).checked)" />
          <span>Mostrar inativos</span>
        </label>
        @if (!usuarios.isLoading()) {
          <span class="toolbar__count">{{ usuariosFiltrados().length }} usuário{{ usuariosFiltrados().length !== 1 ? 's' : '' }}</span>
        }
      </div>

      <!-- Tabela -->
      <main class="content">
        @if (usuarios.isLoading()) {
          <div class="table-wrap">
            <table class="tabela">
              <thead><tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr></thead>
              <tbody>
                @for (i of skeletons; track i) {
                  <tr>
                    @for (j of [1,2,3,4,5]; track j) {
                      <td><app-skeleton height="1rem" [width]="j === 5 ? '80px' : '75%'" /></td>
                    }
                  </tr>
                }
              </tbody>
            </table>
          </div>
        } @else if (usuarios.error()) {
          <div class="empty-state">
            <lucide-icon name="wifi-off" [size]="40" color="var(--b-fg-subtle)" />
            <p>Erro ao carregar usuários</p>
            <button class="b-btn-secondary" (click)="usuarios.reload()">Tentar novamente</button>
          </div>
        } @else if (usuariosFiltrados().length === 0) {
          <div class="empty-state">
            <lucide-icon name="users" [size]="48" color="var(--b-fg-subtle)" />
            <p class="empty-state__title">Nenhum usuário encontrado</p>
            @if (!busca() && filtroPerfil() === null) {
              <button class="b-btn-primary" (click)="abrirCriar()">
                <lucide-icon name="user-plus" [size]="16" />
                Criar primeiro usuário
              </button>
            }
          </div>
        } @else {
          <div class="table-wrap">
            <table class="tabela">
              <thead>
                <tr><th>Nome</th><th>E-mail</th><th>Perfil</th><th>Status</th><th></th></tr>
              </thead>
              <tbody>
                @for (u of usuariosFiltrados(); track u.id) {
                  <tr class="tabela__row" [class.tabela__row--inativo]="!u.ativo">
                    <td>
                      <div class="usuario-info">
                        <div class="avatar" [attr.data-perfil]="u.perfil">{{ iniciais(u.nome) }}</div>
                        <span class="tabela__nome">{{ u.nome }}</span>
                      </div>
                    </td>
                    <td class="tabela__email">{{ u.email }}</td>
                    <td>
                      <span class="perfil-badge perfil-badge--{{ u.perfil }}">{{ perfilLabel(u.perfil) }}</span>
                    </td>
                    <td>
                      <button class="status-toggle" [class.status-toggle--ativo]="u.ativo" [class.status-toggle--inativo]="!u.ativo"
                        (click)="toggleAtivo(u)" [disabled]="toggling() === u.id" aria-label="Alternar status">
                        @if (toggling() === u.id) {
                          <lucide-icon name="loader-2" [size]="12" class="b-spin" />
                        } @else {
                          <lucide-icon [name]="u.ativo ? 'check-circle-2' : 'x-circle'" [size]="13" />
                        }
                        {{ u.ativo ? 'ativo' : 'inativo' }}
                      </button>
                    </td>
                    <td class="tabela__acoes">
                      <button class="acao-btn acao-btn--edit" (click)="abrirEditar(u)" aria-label="Editar">
                        <lucide-icon name="pencil" [size]="15" />
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </main>
    </div>

    <!-- Painel lateral -->
    @if (painelAberto()) {
      <div class="painel-backdrop" (click)="fecharPainel()"></div>
      <aside class="painel" role="dialog" aria-modal="true">
        <div class="painel__header">
          <h2 class="painel__titulo">{{ editandoId() ? 'Editar usuário' : 'Novo usuário' }}</h2>
          <button class="painel__fechar" (click)="fecharPainel()" aria-label="Fechar">
            <lucide-icon name="x" [size]="20" />
          </button>
        </div>

        <div class="painel__form">
          <!-- Nome -->
          <div class="campo">
            <label class="b-label" for="f-nome">Nome <span class="obrigatorio">*</span></label>
            <input id="f-nome" class="b-input" type="text"
              [value]="model().nome"
              (input)="setField('nome', $any($event.target).value)"
              (blur)="tocou('nome')"
              placeholder="Nome completo" />
            @if (erroVisivel('nome')) { <span class="b-error-message">{{ erroVisivel('nome') }}</span> }
          </div>

          <!-- E-mail -->
          <div class="campo">
            <label class="b-label" for="f-email">E-mail <span class="obrigatorio">*</span></label>
            <input id="f-email" class="b-input" type="email"
              [value]="model().email"
              (input)="setField('email', $any($event.target).value)"
              (blur)="tocou('email')"
              placeholder="usuario@email.com"
              [disabled]="!!editandoId()" />
            @if (erroVisivel('email')) { <span class="b-error-message">{{ erroVisivel('email') }}</span> }
            @if (editandoId()) { <span class="campo__hint">O e-mail não pode ser alterado.</span> }
          </div>

          <!-- Senha -->
          <div class="campo">
            <label class="b-label" for="f-senha">
              Senha
              @if (!editandoId()) { <span class="obrigatorio">*</span> }
              @else { <span class="campo__hint">(deixe em branco para manter)</span> }
            </label>
            <div class="senha-wrap">
              <input id="f-senha" class="b-input" [type]="mostrarSenha() ? 'text' : 'password'"
                [value]="model().senha"
                (input)="setField('senha', $any($event.target).value)"
                (blur)="tocou('senha')"
                placeholder="{{ editandoId() ? '••••••••' : 'Mín. 6 caracteres' }}" />
              <button type="button" class="btn-olho" (click)="mostrarSenha.set(!mostrarSenha())" aria-label="Mostrar/ocultar senha">
                <lucide-icon [name]="mostrarSenha() ? 'eye-off' : 'eye'" [size]="16" />
              </button>
            </div>
            @if (erroVisivel('senha')) { <span class="b-error-message">{{ erroVisivel('senha') }}</span> }
          </div>

          <!-- Perfil -->
          <div class="campo">
            <label class="b-label" for="f-perfil">Perfil de acesso <span class="obrigatorio">*</span></label>
            <select id="f-perfil" class="b-input"
              [value]="model().perfil"
              (change)="setField('perfil', $any($event.target).value)"
              (blur)="tocou('perfil')">
              <option value="">Selecione um perfil</option>
              @for (p of perfis; track p) {
                <option [value]="p">{{ perfilLabel(p) }}</option>
              }
            </select>
            @if (erroVisivel('perfil')) { <span class="b-error-message">{{ erroVisivel('perfil') }}</span> }
          </div>

          <!-- Ações -->
          <div class="painel__acoes">
            <button type="button" class="b-btn-secondary" (click)="fecharPainel()">Cancelar</button>
            <button type="button" class="b-btn-primary" [disabled]="salvando()" (click)="salvar()">
              @if (salvando()) {
                <lucide-icon name="loader-2" [size]="16" class="b-spin" />
                Salvando...
              } @else {
                <lucide-icon name="check" [size]="16" />
                {{ editandoId() ? 'Salvar' : 'Criar usuário' }}
              }
            </button>
          </div>
        </div>
      </aside>
    }

    @if (confirmarToggle()) {
      <app-confirm-dialog
        [title]="confirmarToggle()!.ativo ? 'Desativar usuário?' : 'Reativar usuário?'"
        [message]="mensagemToggle()"
        [confirmLabel]="confirmarToggle()!.ativo ? 'Desativar' : 'Reativar'"
        cancelLabel="Cancelar"
        [confirmDanger]="!!confirmarToggle()!.ativo"
        (confirmed)="confirmarToggleAtivo()"
        (cancelled)="confirmarToggle.set(null)" />
    }
  `,
  styles: [`
    .layout { display: flex; flex-direction: column; min-height: 100dvh; background-color: var(--b-bg); font-family: var(--b-font-sans); }

    .topbar { display: flex; align-items: center; gap: var(--b-space-3); padding: var(--b-space-4) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); }
    .topbar__title { flex: 1; font-size: var(--b-font-size-2xl); font-weight: var(--b-font-weight-extrabold); color: var(--b-fg); margin: 0; }
    .btn-novo { display: flex; align-items: center; gap: var(--b-space-2); min-height: 44px; white-space: nowrap; }

    .toolbar { display: flex; align-items: center; gap: var(--b-space-3); flex-wrap: wrap; padding: var(--b-space-3) var(--b-space-6); background-color: var(--b-bg-elevated); border-bottom: 1px solid var(--b-neutral-100); }
    .search-box { display: flex; align-items: center; gap: var(--b-space-2); padding: var(--b-space-2) var(--b-space-3); background-color: var(--b-bg-sunken); border: 1px solid var(--b-neutral-200); border-radius: var(--b-radius-sm); width: 280px; max-width: 100%; }
    .search-input { flex: 1; border: none; background: transparent; font-size: var(--b-font-size-sm); color: var(--b-fg); outline: none; font-family: var(--b-font-sans); &::placeholder { color: var(--b-fg-subtle); } }
    .search-clear { display: flex; align-items: center; border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; padding: 2px; &:hover { color: var(--b-fg); } }
    .filtro-tabs { display: flex; gap: var(--b-space-1); flex-wrap: wrap; }
    .filtro-tab { padding: var(--b-space-1) var(--b-space-3); border-radius: var(--b-radius-sm); border: 1px solid var(--b-neutral-200); background: transparent; font-size: var(--b-font-size-sm); font-weight: var(--b-font-weight-medium); color: var(--b-fg-muted); cursor: pointer; font-family: var(--b-font-sans); min-height: 36px; &:hover { background-color: var(--b-bg-sunken); } &--active { background-color: var(--b-primary-500); border-color: var(--b-primary-500); color: var(--b-fg-inverted); font-weight: var(--b-font-weight-semibold); } }
    .toggle-inativos { display: flex; align-items: center; gap: var(--b-space-2); font-size: var(--b-font-size-sm); color: var(--b-fg-muted); cursor: pointer; input { cursor: pointer; accent-color: var(--b-primary-500); } }
    .toolbar__count { margin-left: auto; font-size: var(--b-font-size-sm); color: var(--b-fg-muted); }

    .content { flex: 1; padding: var(--b-space-6); }
    @media (max-width: 767px) {
      .topbar { padding: var(--b-space-4) var(--b-space-4); }
      .toolbar { padding: var(--b-space-3) var(--b-space-4); }
      .search-box { width: 100%; }
      .content { padding: var(--b-space-4); }
    }

    .table-wrap { background-color: var(--b-bg-elevated); border-radius: var(--b-radius-md); border: 1px solid var(--b-neutral-100); box-shadow: var(--b-shadow-1); overflow: auto; }
    .tabela { width: 100%; border-collapse: collapse; font-size: var(--b-font-size-sm); font-family: var(--b-font-sans);
      th { text-align: left; padding: var(--b-space-3) var(--b-space-4); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-bold); color: var(--b-fg-muted); text-transform: uppercase; letter-spacing: 0.04em; background-color: var(--b-bg-sunken); border-bottom: 1px solid var(--b-neutral-100); }
      td { padding: var(--b-space-3) var(--b-space-4); border-bottom: 1px solid var(--b-neutral-100); vertical-align: middle; }
    }
    .tabela__row { transition: background-color 0.1s; &:hover { background-color: var(--b-bg-sunken); } &:last-child td { border-bottom: none; } &--inativo { opacity: 0.55; } }
    .usuario-info { display: flex; align-items: center; gap: var(--b-space-3); }
    .avatar { width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-bold); color: white; flex-shrink: 0;
      &[data-perfil="admin"]   { background-color: var(--b-primary-500); }
      &[data-perfil="garcom"]  { background-color: var(--b-secondary-500); }
      &[data-perfil="cozinha"] { background-color: var(--b-warning-500, #E8A53E); }
      &[data-perfil="caixa"]   { background-color: var(--b-success-600, #3D8B60); }
    }
    .tabela__nome { font-weight: var(--b-font-weight-semibold); color: var(--b-fg); }
    .tabela__email { color: var(--b-fg-muted); font-size: var(--b-font-size-xs); }
    .tabela__acoes { display: flex; gap: var(--b-space-1); justify-content: flex-end; }

    .perfil-badge { display: inline-flex; align-items: center; padding: 2px var(--b-space-2); border-radius: var(--b-radius-sm); font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-semibold);
      &--admin   { background: var(--b-primary-100); color: var(--b-primary-700); }
      &--garcom  { background: var(--b-secondary-100); color: var(--b-secondary-700); }
      &--cozinha { background: var(--b-warning-100, #FDF3DC); color: var(--b-warning-700, #8A5900); }
      &--caixa   { background: var(--b-success-100); color: var(--b-success-700); }
    }

    .status-toggle { display: inline-flex; align-items: center; gap: var(--b-space-1); padding: 3px var(--b-space-2); border-radius: var(--b-radius-sm); border: 1px solid; font-size: var(--b-font-size-xs); font-weight: var(--b-font-weight-semibold); cursor: pointer; font-family: var(--b-font-sans); transition: all 0.15s; min-height: 28px;
      &--ativo   { background: var(--b-success-50); border-color: var(--b-success-200); color: var(--b-success-700); &:hover:not(:disabled) { background: var(--b-success-100); } }
      &--inativo { background: var(--b-neutral-50); border-color: var(--b-neutral-200); color: var(--b-neutral-500); &:hover:not(:disabled) { background: var(--b-neutral-100); } }
      &:disabled { cursor: not-allowed; opacity: 0.6; }
    }

    .acao-btn { display: flex; align-items: center; justify-content: center; min-width: 36px; min-height: 36px; border-radius: var(--b-radius-sm); border: 1px solid transparent; background: transparent; cursor: pointer; &--edit { color: var(--b-fg-muted); &:hover { background: var(--b-bg-sunken); color: var(--b-fg); border-color: var(--b-neutral-200); } } }

    .empty-state { display: flex; flex-direction: column; align-items: center; gap: var(--b-space-3); padding: var(--b-space-16) var(--b-space-4); text-align: center; color: var(--b-fg-muted); font-size: var(--b-font-size-sm); }
    .empty-state__title { font-size: var(--b-font-size-lg); font-weight: var(--b-font-weight-semibold); color: var(--b-fg); margin: 0; }

    /* Painel */
    .painel-backdrop { position: fixed; inset: 0; background-color: rgba(44,26,14,0.4); backdrop-filter: blur(2px); z-index: 100; }
    .painel { position: fixed; top: 0; right: 0; bottom: 0; width: 100%; max-width: 460px; background-color: var(--b-bg-elevated); box-shadow: var(--b-shadow-4); z-index: 101; display: flex; flex-direction: column; overflow-y: auto; }
    .painel__header { display: flex; align-items: center; justify-content: space-between; padding: var(--b-space-5); border-bottom: 1px solid var(--b-neutral-100); flex-shrink: 0; }
    .painel__titulo { font-size: var(--b-font-size-xl); font-weight: var(--b-font-weight-bold); color: var(--b-fg); margin: 0; }
    .painel__fechar { display: flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; border-radius: var(--b-radius-sm); border: none; background: transparent; color: var(--b-fg-muted); cursor: pointer; &:hover { background-color: var(--b-bg-sunken); } }
    .painel__form { flex: 1; padding: var(--b-space-5); display: flex; flex-direction: column; gap: var(--b-space-4); }
    .campo { display: flex; flex-direction: column; gap: var(--b-space-2); }
    .obrigatorio { color: var(--b-danger-500); }
    .campo__hint { font-size: var(--b-font-size-xs); color: var(--b-fg-muted); }
    .senha-wrap { position: relative; display: flex; align-items: center; input { padding-right: var(--b-space-10); } }
    .btn-olho { position: absolute; right: var(--b-space-3); background: transparent; border: none; color: var(--b-fg-muted); cursor: pointer; display: flex; align-items: center; padding: var(--b-space-1); &:hover { color: var(--b-fg); } }
    .painel__acoes { display: flex; justify-content: flex-end; gap: var(--b-space-3); padding-top: var(--b-space-4); border-top: 1px solid var(--b-neutral-100); margin-top: auto;
      button { min-height: 44px; display: flex; align-items: center; gap: var(--b-space-2); &:disabled { opacity: 0.6; cursor: not-allowed; } }
    }

  `],
})
export class UsuariosComponent {
  protected readonly router = inject(Router);
  private readonly adminService = inject(AdminService);
  private readonly toast = inject(ToastService);

  protected readonly perfis = PERFIS;
  protected readonly skeletons = Array.from({ length: 6 }, (_, i) => i);

  protected readonly busca = signal('');
  protected readonly filtroPerfil = signal<Perfil | null>(null);
  protected readonly mostrarInativos = signal(false);

  protected readonly usuarios = resource({
    loader: () => this.adminService.listarUsuarios(),
  });

  protected readonly usuariosFiltrados = computed(() => {
    const lista = [...(this.usuarios.value() ?? [])].sort((a, b) => a.nome.localeCompare(b.nome));
    const q = this.busca().toLowerCase().trim();
    const p = this.filtroPerfil();
    const ativos = this.mostrarInativos();
    return lista.filter(u =>
      (ativos || u.ativo) &&
      (!q || u.nome.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)) &&
      (p === null || u.perfil === p)
    );
  });

  protected perfilLabel(p: Perfil): string {
    return PERFIL_LABEL[p];
  }

  protected iniciais(nome: string): string {
    return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase();
  }

  // Form state
  protected readonly painelAberto = signal(false);
  protected readonly editandoId = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly mostrarSenha = signal(false);
  protected readonly toggling = signal<string | null>(null);
  protected readonly confirmarToggle = signal<Usuario | null>(null);

  protected readonly model = signal<UsuarioModel>({ ...MODELO_VAZIO });
  private readonly _tocados = signal<Set<Campo>>(new Set());

  protected readonly erros = computed(() => {
    const m = this.model();
    const editando = this.editandoId();
    const e: Partial<Record<Campo, string>> = {};
    if (!m.nome.trim() || m.nome.trim().length < 2) e.nome = 'Nome é obrigatório (mín. 2 caracteres)';
    if (!editando && !EMAIL_RE.test(m.email)) e.email = 'Informe um e-mail válido';
    if (!editando && m.senha.length < 6) e.senha = 'Senha deve ter no mínimo 6 caracteres';
    if (editando && m.senha && m.senha.length < 6) e.senha = 'Nova senha deve ter no mínimo 6 caracteres';
    if (!m.perfil) e.perfil = 'Selecione um perfil de acesso';
    return e;
  });

  protected readonly formValido = computed(() => Object.keys(this.erros()).length === 0);

  protected setField(campo: Campo, value: unknown): void {
    this.model.update(m => ({ ...m, [campo]: value }));
  }

  protected tocou(campo: Campo): void {
    this._tocados.update(s => new Set([...s, campo]));
  }

  protected erroVisivel(campo: Campo): string | null {
    if (!this._tocados().has(campo)) return null;
    return this.erros()[campo] ?? null;
  }

  private marcarTodosTocados(): void {
    this._tocados.set(new Set<Campo>(['nome', 'email', 'senha', 'perfil']));
  }

  protected abrirCriar(): void {
    this.editandoId.set(null);
    this.model.set({ ...MODELO_VAZIO });
    this._tocados.set(new Set());
    this.mostrarSenha.set(false);
    this.painelAberto.set(true);
  }

  protected abrirEditar(u: Usuario): void {
    this.editandoId.set(u.id);
    this.model.set({ nome: u.nome, email: u.email, senha: '', perfil: u.perfil });
    this._tocados.set(new Set());
    this.mostrarSenha.set(false);
    this.painelAberto.set(true);
  }

  protected fecharPainel(): void {
    this.painelAberto.set(false);
    this.editandoId.set(null);
  }

  protected async salvar(): Promise<void> {
    this.marcarTodosTocados();
    if (!this.formValido() || this.salvando()) return;

    this.salvando.set(true);
    const m = this.model();

    try {
      const id = this.editandoId();
      if (id) {
        const payload: Partial<CriarUsuarioPayload> = {
          nome: m.nome.trim(),
          perfil: m.perfil as Perfil,
        };
        if (m.senha) payload.senha = m.senha;
        await this.adminService.editarUsuario(id, payload);
        this.toast.success('Usuário atualizado!');
      } else {
        const payload: CriarUsuarioPayload = {
          nome: m.nome.trim(),
          email: m.email.trim(),
          senha: m.senha,
          perfil: m.perfil as Perfil,
        };
        await this.adminService.criarUsuario(payload);
        this.toast.success('Usuário criado!');
      }
      this.fecharPainel();
      this.usuarios.reload();
    } catch {
      this.toast.danger('Não foi possível salvar o usuário. Tente novamente.');
    } finally {
      this.salvando.set(false);
    }
  }

  protected toggleAtivo(u: Usuario): void {
    this.confirmarToggle.set(u);
  }

  protected mensagemToggle(): string {
    const u = this.confirmarToggle();
    if (!u) return '';
    return u.ativo
      ? `Desativar "${u.nome}"? O usuário não conseguirá mais fazer login.`
      : `Reativar "${u.nome}"? O acesso ao sistema será restaurado.`;
  }

  protected async confirmarToggleAtivo(): Promise<void> {
    const u = this.confirmarToggle();
    if (!u) return;
    this.confirmarToggle.set(null);
    this.toggling.set(u.id);
    try {
      await this.adminService.toggleUsuarioAtivo(u.id, !u.ativo);
      this.toast.success(u.ativo ? `"${u.nome}" desativado.` : `"${u.nome}" reativado.`);
      this.usuarios.reload();
    } catch {
      this.toast.danger('Não foi possível alterar o status do usuário.');
    } finally {
      this.toggling.set(null);
    }
  }

}
