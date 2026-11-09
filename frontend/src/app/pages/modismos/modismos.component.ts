import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { HttpClient } from '@angular/common/http';
import { SidebarService } from '../../core/services/sidebar.service';

@Component({
  selector: 'app-modismos',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-200">
      <app-sidebar></app-sidebar>

      <main
        [ngClass]="sidebarService.isCollapsed() ? 'md:ml-16' : 'md:ml-64'"
        class="flex-1 flex flex-col h-screen overflow-y-auto px-6 sm:px-10 pt-16 sm:pt-8 pb-8 bg-[var(--bg-main)] transition-all duration-300 ease-in-out">
        
        <!-- Header -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800/80 mb-6">
          <div>
            <div class="flex items-center gap-2.5">
              <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Diccionario y Corpus Dialectal Ecuatoriano
              </h1>
              <span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 border border-amber-500/20">
                UPEC
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
              Base de conocimiento lingüístico UPEC (Tablas 6 y 7 de la Tesis)
            </p>
          </div>
          
          <div class="flex items-center">
            <!-- Badge contador con fondo verde oscuro translúcido y texto verde brillante -->
            <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-sm tracking-wide">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {{ modismosList.length }} Expresiones Indexadas
            </span>
          </div>
        </div>

        <!-- Filter Bar -->
        <div class="flex flex-col sm:flex-row items-center gap-3 sm:gap-4 mb-6">
          <div class="relative flex-1 w-full">
            <i class="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm"></i>
            <input 
              type="text" 
              [(ngModel)]="searchQuery" 
              placeholder="Buscar modismo, significado o ejemplo..." 
              class="w-full h-11 bg-white dark:bg-[#151E32] text-slate-900 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 rounded-xl pl-11 pr-4 text-xs sm:text-sm border border-slate-200 dark:border-slate-800/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-sm"
            />
          </div>

          <div class="w-full sm:w-56">
            <select 
              [(ngModel)]="selectedRegion" 
              class="w-full h-11 bg-white dark:bg-[#151E32] text-slate-900 dark:text-slate-100 rounded-xl px-4 text-xs sm:text-sm border border-slate-200 dark:border-slate-800/90 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all shadow-sm cursor-pointer">
              <option value="">Todas las regiones</option>
              <option value="Sierra">Sierra</option>
              <option value="Carchi">Carchi</option>
              <option value="Costa">Costa</option>
              <option value="Nacional">Nacional</option>
            </select>
          </div>
        </div>

        <!-- Modisms Grid (2 Columnas en pantallas grandes, altura uniforme) -->
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-5 pb-12 items-stretch">
          <div 
            *ngFor="let item of filteredModismos" 
            class="flex flex-col justify-between p-5 rounded-2xl bg-white dark:bg-[#151E32] border border-slate-200/80 dark:border-slate-800/90 shadow-sm hover:shadow-md transition-all duration-200 hover:-translate-y-0.5">
            
            <div class="space-y-4">
              <!-- Top Row: Título, Región y Badge de Estado -->
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <h3 class="text-lg sm:text-xl font-bold text-slate-900 dark:text-white font-mono tracking-tight break-words">
                    {{ item.nombre_modismo }}
                  </h3>
                  <span class="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    {{ item.region }}
                  </span>
                </div>
                <span class="shrink-0 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border border-emerald-500/30">
                  {{ item.estado || 'Activo' }}
                </span>
              </div>

              <!-- Cajas internas: Significado (sin fondo oscuro pesado, con línea sutil a la izquierda) -->
              <div class="border-l-[3px] border-emerald-500 pl-3.5 py-1.5 bg-slate-50/60 dark:bg-slate-800/30 rounded-r-xl">
                <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-1">
                  SIGNIFICADO:
                </span>
                <p class="text-xs sm:text-sm text-slate-800 dark:text-slate-200 leading-relaxed font-normal">
                  {{ getSignificado(item) }}
                </p>
              </div>

              <!-- Cajas internas: Ejemplo de uso (con línea sutil a la izquierda y texto cursiva) -->
              <div *ngIf="getEjemplo(item)" class="border-l-[3px] border-amber-500/80 pl-3.5 py-1.5 bg-amber-50/40 dark:bg-amber-950/20 rounded-r-xl">
                <span class="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 block mb-0.5 not-italic">
                  EJEMPLO DE USO:
                </span>
                <p class="text-xs sm:text-sm text-slate-700 dark:text-slate-300 italic leading-relaxed">
                  "{{ getEjemplo(item) }}"
                </p>
              </div>
            </div>

          </div>
        </div>

      </main>
    </div>
  `
})
export class ModismosComponent implements OnInit {
  searchQuery: string = '';
  selectedRegion: string = '';
  modismosList: any[] = [];

  constructor(
    private http: HttpClient,
    public sidebarService: SidebarService
  ) {}

  ngOnInit(): void {
    this.cargarModismos();
  }

  cargarModismos(): void {
    this.http.get<any[]>('/api/modismos/').subscribe({
      next: (data) => this.modismosList = data,
      error: () => this.modismosList = this.getFallbackModismos()
    });
  }

  getSignificado(item: any): string {
    if (item.significados && item.significados.length > 0) {
      return item.significados[0].significado;
    }
    return item.descripcion || 'Sin descripción disponible';
  }

  getEjemplo(item: any): string {
    if (item.ejemplos && item.ejemplos.length > 0) {
      return item.ejemplos[0].ejemplo;
    }
    return '';
  }

  get filteredModismos(): any[] {
    return this.modismosList.filter(m => {
      const matchQuery = !this.searchQuery || 
        m.nombre_modismo.toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        this.getSignificado(m).toLowerCase().includes(this.searchQuery.toLowerCase()) ||
        this.getEjemplo(m).toLowerCase().includes(this.searchQuery.toLowerCase());
      
      const matchRegion = !this.selectedRegion || 
        m.region.toLowerCase().includes(this.selectedRegion.toLowerCase());

      return matchQuery && matchRegion;
    });
  }

  private getFallbackModismos(): any[] {
    return [
      { nombre_modismo: "¡achachay!", region: "Sierra / Carchi", descripcion: "Expresión que se utiliza para referirse a que la persona experimenta demasiado frío.", ejemplos: [{ ejemplo: "¡achachay! el viento de Tulcán me está congelando." }] },
      { nombre_modismo: "¡chulla vida!", region: "Sierra / Pichincha", descripcion: "Significa que solo hay una vida y hay que disfrutarla al máximo.", ejemplos: [{ ejemplo: "Me voy a ir de viaje con mis amigos, total, ¡es chulla vida!" }] },
      { nombre_modismo: "¡chuta!", region: "Nacional / Sierra", descripcion: "Expresa sorpresa, frustración, enojo o lástima, similar a decir 'rayos'.", ejemplos: [{ ejemplo: "Chuta, se me pasó el bus." }] },
      { nombre_modismo: "¿cachas?", region: "Nacional", descripcion: "Preguntar a la persona si entendió un tema en específico.", ejemplos: [{ ejemplo: "Tuve que cambiar mis horarios de trabajo, ¿cachas?" }] },
      { nombre_modismo: "aquisito nomás", region: "Sierra", descripcion: "Lugar que queda cerca o a corta distancia.", ejemplos: [{ ejemplo: "Vamos a la tienda de aquisito nomás." }] },
      { nombre_modismo: "chuchaqui", region: "Nacional", descripcion: "Malestar o resaca tras consumir licor.", ejemplos: [{ ejemplo: "Juan está comiendo encebollado para curar el chuchaqui." }] },
      { nombre_modismo: "camellar", region: "Nacional", descripcion: "Cuando una persona debe trabajar.", ejemplos: [{ ejemplo: "Mi amigo tuvo que camellar todo el día." }] },
      { nombre_modismo: "de ley", region: "Nacional", descripcion: "Equivalente a por supuesto, sin duda alguna.", ejemplos: [{ ejemplo: "De ley que vamos a esa reunión." }] },
      { nombre_modismo: "de una", region: "Nacional", descripcion: "Realizar una acción de manera inmediata.", ejemplos: [{ ejemplo: "Si van a jugar pelota, de una les caigo." }] },
      { nombre_modismo: "veci", region: "Sierra / Carchi", descripcion: "Usado para dirigirse respetuosamente a un vecino o dependiente.", ejemplos: [{ ejemplo: "Buenos días veci, ¿en qué le puedo ayudar?" }] },
      { nombre_modismo: "no seas malito", region: "Sierra", descripcion: "Expresión típica de la sierra para pedir un favor con cortesía.", ejemplos: [{ ejemplo: "No seas malito préstame el apunte." }] },
      { nombre_modismo: "ponte pilas", region: "Nacional", descripcion: "Estar despierto, concentrado y actuar con diligencia.", ejemplos: [{ ejemplo: "Amigo ponte pilas en la prueba de mañana." }] }
    ];
  }
}
