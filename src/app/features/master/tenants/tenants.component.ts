import { Component, inject, signal, computed, resource } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { LucideAngularModule } from 'lucide-angular';
import { environment } from '../../../../environments/environment';
import { MasterAuthService } from '../../../core/master/master-auth.service';

interface TenantInfo {
  id: string;
  nome: string;
  slug: string;
  plano: string;
  ativo: boolean;
  criadoEm: string;
  _count: { usuarios: number; comandas: number };
}

@Component({
  selector: 'app-tenants',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="page">
      <!-- Header -->
      <div class="page__header">
        <div>
          <h1 class="page__title">Tenants</h1>
          <p class="page__sub">{{ tenants.value()?.length ?? 0 }} restaurante(s) cadastrado(s)</p>
        </div>
        <button class="btn-primary" (click)="abrirModalCriar()">
          <lucide-icon name="plus" [size]="16" />
          Novo tenant
        </button>
      </div>

      <!-- Lista -->
      @if (tenants.isLoading()) {
        <div class="loading">
          <lucide-icon name="loader-2" [size]="24" class="spin" />
        </div>
      } @else if (tenants.error()) {
        <div class="estado-vazio">
          <lucide-icon name="x-circle" [size]="32" color="var(--b-danger-400)" />
          <p>Erro ao carregar tenants</p>
          <button class="btn-ghost" (click)="tenants.reload()">Tentar novamente</button>
        </div>
      } @else if (!tenants.value()?.length) {
        <div class="estado-vazio">
          <lucide-icon name="users" [size]="32" color="var(--b-fg-subtle)" />
          <p>Nenhum tenant cadastrado ainda</p>
          <button class="btn-primary" (click)="abrirModalCriar()">Criar primeiro tenant</button>
        </div>
      } @else {
        <div class="grid">
          @for (tenant of tenants.value()!; track tenant.id) {
            <div class="tenant-card" [class.tenant-card--inativo]="!tenant.ativo">
              <div class="tenant-card__header">
                <div class="tenant-card__info">
                  <span class="tenant-card__nome">{{ tenant.nome }}</span>
                  <span class="tenant-card__slug">{{ tenant.slug }}</span>
                </div>
                <div class="tenant-card__badges">
                  <span class="badge" [class.badge--pro]="tenant.plano === 'pro'">
                    {{ tenant.plano }}
                  </span>
                  <span class="badge" [class.badge--ativo]="tenant.ativo" [class.badge--inativo]="!tenant.ativo">
                    {{ tenant.ativo ? 'ativo' : 'inativo' }}
                  </span>
                </div>
              </div>

              <div class="tenant-card__stats">
                <div class="stat">
                  <lucide-icon name="users" [size]="13" />
                  {{ tenant._count.usuarios }} usuário(s)
                </div>
                <div class="stat">
                  <lucide-icon name="receipt" [size]="13" />
                  {{ tenant._count.comandas }} comanda(s)
                </div>
                <div class="stat">
                  <lucide-icon name="clock" [size]="13" />
                  {{ formatarData(tenant.criadoEm) }}
                </div>
              </div>

              <div class="tenant-card__actions">
                <button
                  class="btn-acessar"
                  (click)="acessar(tenant)"
                  [disabled]="!tenant.ativo || acessandoId() === tenant.id"
                >
                  @if (acessandoId() === tenant.id) {
                    <lucide-icon name="loader-2" [size]="14" class="spin" />
                    Acessando...
                  } @else {
                    <lucide-icon name="log-in" [size]="14" />
                    Acessar
                  }
                </button>
                <button class="btn-editar" (click)="abrirModalEditar(tenant)">
                  <lucide-icon name="pencil" [size]="14" />
                  Editar
                </button>
              </div>
            </div>
          }
        </div>
      }
    </div>

    <!-- Modal criar tenant -->
    @if (modalCriar()) {
      <div class="modal-overlay" (click)="fecharModalCriar()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h2 class="modal__title">Novo tenant</h2>
            <button class="modal__close" (click)="fecharModalCriar()">
              <lucide-icon name="x" [size]="18" />
            </button>
          </div>

          <form class="modal__form" (submit)="criarTenant($event)" novalidate>
            <div class="field-row">
              <div class="field">
                <label class="label">Nome do restaurante</label>
                <input class="input" type="text" placeholder="Burguer House"
                  [value]="criar.nome()" (input)="onNomeInput($any($event.target).value)" />
              </div>
              <div class="field">
                <label class="label">Slug (subdomínio)</label>
                <input class="input" type="text" placeholder="burguer-house"
                  [value]="criar.slug()" (input)="criar.slug.set($any($event.target).value)" />
              </div>
            </div>

            <div class="field">
              <label class="label">Plano</label>
              <select class="input" [value]="criar.plano()"
                (change)="criar.plano.set($any($event.target).value)">
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div class="field-group-label">Usuário admin inicial</div>

            <div class="field-row">
              <div class="field">
                <label class="label">Nome</label>
                <input class="input" type="text" placeholder="João Silva"
                  [value]="criar.adminNome()" (input)="criar.adminNome.set($any($event.target).value)" />
              </div>
              <div class="field">
                <label class="label">E-mail</label>
                <input class="input" type="email" placeholder="admin@burguer.com"
                  [value]="criar.adminEmail()" (input)="criar.adminEmail.set($any($event.target).value)" />
              </div>
            </div>

            <div class="field">
              <label class="label">Senha</label>
              <input class="input" type="password" placeholder="mínimo 6 caracteres"
                [value]="criar.adminSenha()" (input)="criar.adminSenha.set($any($event.target).value)" />
            </div>

            @if (erroModal()) {
              <p class="erro">{{ erroModal() }}</p>
            }

            <div class="modal__footer">
              <button type="button" class="btn-ghost" (click)="fecharModalCriar()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="salvando()">
                @if (salvando()) {
                  <lucide-icon name="loader-2" [size]="14" class="spin" />
                  Criando...
                } @else {
                  Criar tenant
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }

    <!-- Modal editar tenant -->
    @if (modalEditar()) {
      <div class="modal-overlay" (click)="fecharModalEditar()">
        <div class="modal" (click)="$event.stopPropagation()">
          <div class="modal__header">
            <h2 class="modal__title">Editar tenant</h2>
            <button class="modal__close" (click)="fecharModalEditar()">
              <lucide-icon name="x" [size]="18" />
            </button>
          </div>

          <form class="modal__form" (submit)="atualizarTenant($event)" novalidate>
            <div class="field">
              <label class="label">Nome do restaurante</label>
              <input class="input" type="text"
                [value]="editar.nome()" (input)="editar.nome.set($any($event.target).value)" />
            </div>

            <div class="field">
              <label class="label">Slug (subdomínio)</label>
              <input class="input" type="text" [value]="modalEditar()!.slug" disabled />
              <span class="field__hint">O slug não pode ser alterado</span>
            </div>

            <div class="field">
              <label class="label">Plano</label>
              <select class="input" [value]="editar.plano()"
                (change)="editar.plano.set($any($event.target).value)">
                <option value="basic">Basic</option>
                <option value="pro">Pro</option>
              </select>
            </div>

            <div class="field field--toggle">
              <label class="label">Status</label>
              <button
                type="button"
                class="toggle"
                [class.toggle--ativo]="editar.ativo()"
                (click)="editar.ativo.set(!editar.ativo())"
              >
                <span class="toggle__thumb"></span>
              </button>
              <span class="toggle__label">{{ editar.ativo() ? 'Ativo' : 'Inativo' }}</span>
            </div>

            @if (erroModal()) {
              <p class="erro">{{ erroModal() }}</p>
            }

            <div class="modal__footer">
              <button type="button" class="btn-ghost" (click)="fecharModalEditar()">Cancelar</button>
              <button type="submit" class="btn-primary" [disabled]="salvando()">
                @if (salvando()) {
                  <lucide-icon name="loader-2" [size]="14" class="spin" />
                  Salvando...
                } @else {
                  Salvar
                }
              </button>
            </div>
          </form>
        </div>
      </div>
    }
  `,
  styles: [`
    :host { display: block; }

    .page {
      padding: var(--b-space-6);
      max-width: 1100px;
      margin: 0 auto;
      font-family: var(--b-font-sans);

      @media (max-width: 767px) { padding: var(--b-space-4); }
    }

    .page__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--b-space-4);
      margin-bottom: var(--b-space-6);
    }

    .page__title {
      font-size: var(--b-font-size-2xl);
      font-weight: var(--b-font-weight-extrabold);
      color: var(--b-fg);
      margin: 0;
    }

    .page__sub {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
      margin: var(--b-space-1) 0 0;
    }

    /* ===== GRID ===== */
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
      gap: var(--b-space-4);
    }

    /* ===== TENANT CARD ===== */
    .tenant-card {
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-md);
      border: 1px solid var(--b-neutral-100);
      box-shadow: var(--b-shadow-1);
      padding: var(--b-space-4);
      display: flex;
      flex-direction: column;
      gap: var(--b-space-3);
      transition: box-shadow 0.15s;

      &:hover { box-shadow: var(--b-shadow-2); }
      &--inativo { opacity: 0.65; }
    }

    .tenant-card__header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--b-space-2);
    }

    .tenant-card__info {
      display: flex;
      flex-direction: column;
      gap: 2px;
      min-width: 0;
    }

    .tenant-card__nome {
      font-size: var(--b-font-size-md);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .tenant-card__slug {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-subtle);
      font-family: monospace;
    }

    .tenant-card__badges {
      display: flex;
      gap: var(--b-space-1);
      flex-shrink: 0;
    }

    .badge {
      display: inline-flex;
      align-items: center;
      padding: 2px var(--b-space-2);
      border-radius: var(--b-radius-sm);
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-semibold);
      text-transform: capitalize;
      background-color: var(--b-neutral-100);
      color: var(--b-fg-muted);

      &--pro { background-color: var(--b-primary-100); color: var(--b-primary-700); }
      &--ativo { background-color: var(--b-success-100); color: var(--b-success-700); }
      &--inativo { background-color: var(--b-danger-100); color: var(--b-danger-700); }
    }

    .tenant-card__stats {
      display: flex;
      flex-wrap: wrap;
      gap: var(--b-space-3);
      padding: var(--b-space-3) 0;
      border-top: 1px solid var(--b-neutral-100);
      border-bottom: 1px solid var(--b-neutral-100);
    }

    .stat {
      display: flex;
      align-items: center;
      gap: var(--b-space-1);
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-muted);
    }

    .tenant-card__actions {
      display: flex;
      gap: var(--b-space-2);
    }

    /* ===== BOTÕES ===== */
    .btn-primary {
      display: inline-flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-4);
      border: none;
      border-radius: var(--b-radius-sm);
      background-color: var(--b-primary-500);
      color: white;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-bold);
      font-family: var(--b-font-sans);
      cursor: pointer;
      min-height: 40px;
      transition: background-color 0.1s;

      &:hover:not(:disabled) { background-color: var(--b-primary-600); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-ghost {
      display: inline-flex;
      align-items: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-3);
      border: 1px solid var(--b-neutral-200);
      border-radius: var(--b-radius-sm);
      background: transparent;
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      cursor: pointer;
      font-family: var(--b-font-sans);
      min-height: 40px;
      transition: background-color 0.1s;

      &:hover { background-color: var(--b-bg-sunken); color: var(--b-fg); }
    }

    .btn-acessar {
      flex: 1;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-3);
      border: none;
      border-radius: var(--b-radius-sm);
      background-color: var(--b-primary-500);
      color: white;
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-bold);
      font-family: var(--b-font-sans);
      cursor: pointer;
      min-height: 36px;
      transition: background-color 0.1s;

      &:hover:not(:disabled) { background-color: var(--b-primary-600); }
      &:disabled { opacity: 0.5; cursor: not-allowed; }
    }

    .btn-editar {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: var(--b-space-2);
      padding: var(--b-space-2) var(--b-space-3);
      border: 1px solid var(--b-neutral-200);
      border-radius: var(--b-radius-sm);
      background: transparent;
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-medium);
      color: var(--b-fg-muted);
      cursor: pointer;
      font-family: var(--b-font-sans);
      min-height: 36px;
      transition: background-color 0.1s;

      &:hover { background-color: var(--b-bg-sunken); color: var(--b-fg); }
    }

    /* ===== LOADING / EMPTY ===== */
    .loading {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--b-space-10) 0;
      color: var(--b-fg-muted);
    }

    .estado-vazio {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: var(--b-space-3);
      padding: var(--b-space-10) 0;
      color: var(--b-fg-muted);
      font-size: var(--b-font-size-sm);
      text-align: center;

      p { margin: 0; }
    }

    /* ===== MODAL ===== */
    .modal-overlay {
      position: fixed;
      inset: 0;
      background-color: rgba(0, 0, 0, 0.45);
      z-index: 300;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: var(--b-space-4);
    }

    .modal {
      width: 100%;
      max-width: 560px;
      background-color: var(--b-bg-elevated);
      border-radius: var(--b-radius-lg);
      box-shadow: var(--b-shadow-3);
      max-height: 90dvh;
      overflow-y: auto;
    }

    .modal__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--b-space-5) var(--b-space-5) 0;
    }

    .modal__title {
      font-size: var(--b-font-size-lg);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg);
      margin: 0;
    }

    .modal__close {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 36px;
      height: 36px;
      border: none;
      background: transparent;
      color: var(--b-fg-muted);
      cursor: pointer;
      border-radius: var(--b-radius-sm);

      &:hover { background-color: var(--b-bg-sunken); }
    }

    .modal__form {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-4);
      padding: var(--b-space-5);
    }

    .modal__footer {
      display: flex;
      justify-content: flex-end;
      gap: var(--b-space-2);
      padding-top: var(--b-space-2);
      border-top: 1px solid var(--b-neutral-100);
    }

    /* ===== FORM ===== */
    .field-row {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: var(--b-space-3);

      @media (max-width: 480px) { grid-template-columns: 1fr; }
    }

    .field {
      display: flex;
      flex-direction: column;
      gap: var(--b-space-1);

      &--toggle {
        flex-direction: row;
        align-items: center;
        gap: var(--b-space-3);
      }
    }

    .field-group-label {
      font-size: var(--b-font-size-xs);
      font-weight: var(--b-font-weight-bold);
      color: var(--b-fg-muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      padding-bottom: var(--b-space-1);
      border-bottom: 1px solid var(--b-neutral-100);
    }

    .label {
      font-size: var(--b-font-size-sm);
      font-weight: var(--b-font-weight-semibold);
      color: var(--b-fg);
    }

    .field__hint {
      font-size: var(--b-font-size-xs);
      color: var(--b-fg-subtle);
    }

    .input {
      height: 40px;
      padding: 0 var(--b-space-3);
      border: 1.5px solid var(--b-neutral-200);
      border-radius: var(--b-radius-sm);
      background-color: var(--b-bg);
      color: var(--b-fg);
      font-size: var(--b-font-size-sm);
      font-family: var(--b-font-sans);
      transition: border-color 0.15s;

      &:focus { outline: none; border-color: var(--b-primary-400); }
      &::placeholder { color: var(--b-fg-subtle); }
      &:disabled { background-color: var(--b-bg-sunken); color: var(--b-fg-muted); cursor: not-allowed; }
    }

    .erro {
      font-size: var(--b-font-size-sm);
      color: var(--b-danger-600);
      background-color: var(--b-danger-50);
      border: 1px solid var(--b-danger-200);
      border-radius: var(--b-radius-sm);
      padding: var(--b-space-2) var(--b-space-3);
      margin: 0;
    }

    /* ===== TOGGLE ===== */
    .toggle {
      position: relative;
      width: 44px;
      height: 24px;
      border: none;
      border-radius: 12px;
      background-color: var(--b-neutral-300);
      cursor: pointer;
      transition: background-color 0.2s;
      flex-shrink: 0;
      padding: 0;

      &--ativo { background-color: var(--b-success-500); }
    }

    .toggle__thumb {
      position: absolute;
      top: 3px;
      left: 3px;
      width: 18px;
      height: 18px;
      border-radius: 50%;
      background-color: white;
      transition: transform 0.2s;

      .toggle--ativo & { transform: translateX(20px); }
    }

    .toggle__label {
      font-size: var(--b-font-size-sm);
      color: var(--b-fg-muted);
    }

    /* ===== SPINNER ===== */
    .spin { animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class TenantsComponent {
  private readonly http = inject(HttpClient);
  private readonly masterAuthService = inject(MasterAuthService);

  protected readonly acessandoId = signal<string | null>(null);
  protected readonly salvando = signal(false);
  protected readonly erroModal = signal('');
  protected readonly modalCriar = signal(false);
  protected readonly modalEditar = signal<TenantInfo | null>(null);

  // Campos do modal criar
  protected readonly criar = {
    nome: signal(''),
    slug: signal(''),
    plano: signal('basic'),
    adminNome: signal(''),
    adminEmail: signal(''),
    adminSenha: signal(''),
  };

  // Campos do modal editar
  protected readonly editar = {
    nome: signal(''),
    plano: signal('basic'),
    ativo: signal(true),
  };

  protected readonly tenants = resource({
    loader: () =>
      firstValueFrom(
        this.http.get<TenantInfo[]>(`${environment.apiUrl}/master/tenants`)
      ),
  });

  protected onNomeInput(value: string): void {
    this.criar.nome.set(value);
    // Auto-gera slug a partir do nome se slug ainda não foi editado manualmente
    const slug = value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    this.criar.slug.set(slug);
  }

  protected abrirModalCriar(): void {
    this.criar.nome.set('');
    this.criar.slug.set('');
    this.criar.plano.set('basic');
    this.criar.adminNome.set('');
    this.criar.adminEmail.set('');
    this.criar.adminSenha.set('');
    this.erroModal.set('');
    this.modalCriar.set(true);
  }

  protected fecharModalCriar(): void {
    this.modalCriar.set(false);
  }

  protected abrirModalEditar(tenant: TenantInfo): void {
    this.editar.nome.set(tenant.nome);
    this.editar.plano.set(tenant.plano);
    this.editar.ativo.set(tenant.ativo);
    this.erroModal.set('');
    this.modalEditar.set(tenant);
  }

  protected fecharModalEditar(): void {
    this.modalEditar.set(null);
  }

  protected async criarTenant(event: Event): Promise<void> {
    event.preventDefault();
    const { nome, slug, plano, adminNome, adminEmail, adminSenha } = this.criar;
    if (!nome() || !slug() || !adminNome() || !adminEmail() || !adminSenha()) {
      this.erroModal.set('Preencha todos os campos');
      return;
    }
    this.erroModal.set('');
    this.salvando.set(true);
    try {
      await firstValueFrom(
        this.http.post(
          `${environment.apiUrl}/master/tenants`,
          {
            nome: nome(),
            slug: slug(),
            plano: plano(),
            adminNome: adminNome(),
            adminEmail: adminEmail(),
            adminSenha: adminSenha(),
          }
        )
      );
      this.fecharModalCriar();
      this.tenants.reload();
    } catch (err: any) {
      const msg = err?.error?.error?.message ?? 'Erro ao criar tenant';
      this.erroModal.set(msg);
    } finally {
      this.salvando.set(false);
    }
  }

  protected async atualizarTenant(event: Event): Promise<void> {
    event.preventDefault();
    const tenant = this.modalEditar();
    if (!tenant) return;
    this.erroModal.set('');
    this.salvando.set(true);
    try {
      await firstValueFrom(
        this.http.patch(
          `${environment.apiUrl}/master/tenants/${tenant.id}`,
          {
            nome: this.editar.nome(),
            plano: this.editar.plano(),
            ativo: this.editar.ativo(),
          }
        )
      );
      this.fecharModalEditar();
      this.tenants.reload();
    } catch (err: any) {
      const msg = err?.error?.error?.message ?? 'Erro ao atualizar tenant';
      this.erroModal.set(msg);
    } finally {
      this.salvando.set(false);
    }
  }

  protected async acessar(tenant: TenantInfo): Promise<void> {
    this.acessandoId.set(tenant.id);
    try {
      await this.masterAuthService.impersonateTenant(tenant.id, tenant.nome);
    } catch {
      this.acessandoId.set(null);
    }
  }

  protected formatarData(iso: string): string {
    return new Date(iso).toLocaleDateString('pt-BR');
  }
}
