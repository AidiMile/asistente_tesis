import { Component, OnInit, ElementRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { SidebarComponent } from '../../components/sidebar/sidebar.component';
import { SidebarService } from '../../core/services/sidebar.service';
import { AuthService } from '../../core/services/auth.service';
import { AssistantService } from '../../core/services/assistant.service';

export interface NuevoModismoForm {
  nombre_modismo: string;
  region: string;
  significado: string;
  ejemplo: string;
}

@Component({
  selector: 'app-gestion-corpus',
  standalone: true,
  imports: [CommonModule, FormsModule, SidebarComponent],
  template: `
    <div class="flex h-screen bg-[var(--bg-main)] text-[var(--text-main)] overflow-hidden transition-colors duration-200">
      <app-sidebar></app-sidebar>

      <main
        [ngClass]="sidebarService.isCollapsed() ? 'md:ml-16' : 'md:ml-64'"
        class="flex-1 flex flex-col h-screen overflow-y-auto px-6 sm:px-10 pt-16 sm:pt-8 pb-12 bg-[var(--bg-main)] transition-all duration-300 ease-in-out">
        
        <!-- 1. Cabecera -->
        <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-slate-200/80 dark:border-slate-800/80 mb-6">
          <div>
            <div class="flex items-center gap-2.5">
              <h1 class="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                Gestión del Corpus Lingüístico
              </h1>
              <span class="inline-block px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-amber-500/10 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300 border border-amber-500/20">
                Admin
              </span>
            </div>
            <p class="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 font-normal">
              Administración centralizada, carga masiva de datos (CSV / Excel) e ingesta dialectal ecuatoriana
            </p>
          </div>

          <div class="flex flex-wrap items-center gap-3">
            <span class="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/80 text-emerald-400 border border-emerald-500/30 text-xs font-semibold shadow-sm tracking-wide">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
              {{ modismosList.length }} Expresiones Indexadas
            </span>
            <button
              (click)="abrirModalNuevo()"
              class="btn-primary py-2 px-4 text-xs font-bold shadow-sm flex items-center gap-2">
              <i class="bi bi-plus-circle-fill"></i>
              <span>+ Registrar Nuevo Modismo</span>
            </button>
          </div>
        </div>

        <!-- 2. Sección Carga Masiva (Dropzone para CSV / Excel) -->
        <div class="p-6 rounded-2xl bg-white dark:bg-[#151E32] border border-slate-200/80 dark:border-slate-800/90 shadow-sm space-y-4 mb-8">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
            <div class="flex items-center gap-2">
              <i class="bi bi-cloud-arrow-up-fill text-sky-600 dark:text-sky-400 text-xl"></i>
              <div>
                <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Carga Masiva de Modismos (Dataset)</h3>
                <p class="text-xs text-slate-500 dark:text-slate-400">Soporta archivos .csv y .xlsx (Excel) con columnas: término, región, significado y ejemplo</p>
              </div>
            </div>
            <button
              type="button"
              (click)="descargarPlantillaCSV()"
              class="text-xs text-sky-600 dark:text-sky-400 hover:underline flex items-center gap-1 self-start sm:self-auto font-medium">
              <i class="bi bi-download"></i> Descargar plantilla CSV de ejemplo
            </button>
          </div>

          <!-- Dropzone visual -->
          <div
            (dragover)="onDragOver($event)"
            (dragleave)="onDragLeave($event)"
            (drop)="onDrop($event)"
            [ngClass]="isDragging ? 'border-emerald-500 bg-emerald-500/5 dark:bg-emerald-500/10' : 'border-slate-300 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-900/50'"
            class="border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all cursor-pointer"
            (click)="fileInput.click()">
            
            <input
              #fileInput
              type="file"
              accept=".csv, .xlsx, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, text/csv"
              (change)="onFileSelected($event)"
              class="hidden"
            />

            <div *ngIf="!selectedFile" class="space-y-3">
              <div class="w-12 h-12 mx-auto rounded-full bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center text-2xl">
                <i class="bi bi-file-earmark-spreadsheet"></i>
              </div>
              <div>
                <p class="text-xs sm:text-sm font-semibold text-slate-800 dark:text-slate-200">
                  Arrastra y suelta tu archivo aquí, o <span class="text-sky-600 dark:text-sky-400 underline">haz clic para examinar</span>
                </p>
                <p class="text-[11px] text-slate-400 mt-1">Archivos compatibles: .csv (delimitado por comas o punto y coma) o .xlsx (Microsoft Excel)</p>
              </div>
            </div>

            <!-- Archivo seleccionado -->
            <div *ngIf="selectedFile" (click)="$event.stopPropagation()" class="flex flex-col sm:flex-row items-center justify-between gap-3 p-4 rounded-xl bg-white dark:bg-slate-800/90 border border-slate-200 dark:border-slate-700 text-left">
              <div class="flex items-center gap-3">
                <i class="bi bi-file-earmark-check text-2xl text-emerald-600 dark:text-emerald-400"></i>
                <div>
                  <p class="text-xs font-bold text-slate-900 dark:text-white">{{ selectedFile.name }}</p>
                  <p class="text-[11px] text-slate-400">{{ formatFileSize(selectedFile.size) }}</p>
                </div>
              </div>

              <div class="flex items-center gap-2">
                <button
                  type="button"
                  (click)="cancelarArchivo()"
                  [disabled]="isUploading"
                  class="px-3 py-1.5 rounded-lg text-xs font-medium text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors">
                  Quitar
                </button>
                <button
                  type="button"
                  (click)="subirArchivo()"
                  [disabled]="isUploading"
                  class="btn-primary py-2 px-4 text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50">
                  <i *ngIf="isUploading" class="bi bi-arrow-repeat animate-spin"></i>
                  <i *ngIf="!isUploading" class="bi bi-cloud-upload-fill"></i>
                  <span>{{ isUploading ? 'Procesando e indexando...' : 'Subir y Procesar Archivo' }}</span>
                </button>
              </div>
            </div>
          </div>

          <!-- Alertas de carga -->
          <div *ngIf="uploadSuccess" class="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-300 text-xs flex items-start gap-2.5">
            <i class="bi bi-check-circle-fill text-base shrink-0 mt-0.5"></i>
            <div>
              <p class="font-bold">Carga Exitosa</p>
              <p class="mt-0.5">{{ uploadSuccess }}</p>
            </div>
          </div>

          <div *ngIf="uploadError" class="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-800 dark:text-rose-300 text-xs flex items-start gap-2.5">
            <i class="bi bi-exclamation-triangle-fill text-base shrink-0 mt-0.5"></i>
            <div>
              <p class="font-bold">Error en la Carga</p>
              <p class="mt-0.5">{{ uploadError }}</p>
            </div>
          </div>
        </div>

        <!-- 3. Tabla de Registros del Corpus -->
        <div class="p-6 rounded-2xl bg-white dark:bg-[#151E32] border border-slate-200/80 dark:border-slate-800/90 shadow-sm space-y-4">
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200/80 dark:border-slate-800/80 pb-4">
            <div>
              <h3 class="text-sm font-bold uppercase tracking-wider text-slate-900 dark:text-white">Registros del Corpus en Base de Datos</h3>
              <p class="text-xs text-slate-500 dark:text-slate-400">Listado de modismos indexados en PostgreSQL con orden cronológico inverso</p>
            </div>
            
            <span class="text-xs font-mono font-semibold text-slate-500 dark:text-slate-400">
              Mostrando {{ filteredModismos.length }} de {{ modismosList.length }} expresiones
            </span>
          </div>

          <!-- Filtros de la tabla -->
          <div class="flex flex-col sm:flex-row items-center gap-3">
            <div class="relative flex-1 w-full">
              <i class="bi bi-search absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
              <input
                type="text"
                [(ngModel)]="searchQuery"
                placeholder="Buscar por término, región o significado..."
                class="w-full h-10 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 placeholder-slate-400 rounded-xl pl-9 pr-3 text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 dark:focus:border-sky-400 transition-colors"
              />
            </div>

            <div class="w-full sm:w-48">
              <select
                [(ngModel)]="selectedRegion"
                class="w-full h-10 bg-slate-50 dark:bg-slate-900/60 text-slate-800 dark:text-slate-200 rounded-xl px-3 text-xs border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-emerald-500 dark:focus:border-sky-400 transition-colors cursor-pointer">
                <option value="">Todas las regiones</option>
                <option value="Sierra">Sierra</option>
                <option value="Carchi">Carchi</option>
                <option value="Pichincha">Pichincha</option>
                <option value="Costa">Costa</option>
                <option value="Manabí">Manabí</option>
                <option value="Guayas">Guayas</option>
                <option value="Amazonía">Amazonía</option>
                <option value="Nacional">Nacional</option>
              </select>
            </div>
          </div>

          <!-- Tabla de datos -->
          <div *ngIf="isLoading" class="py-12 text-center text-xs text-slate-400">
            <i class="bi bi-arrow-repeat animate-spin mr-2"></i> Cargando expresiones del corpus...
          </div>

          <div *ngIf="!isLoading && filteredModismos.length === 0" class="py-12 text-center text-xs text-slate-400">
            No se encontraron modismos que coincidan con la búsqueda.
          </div>

          <div *ngIf="!isLoading && filteredModismos.length > 0" class="overflow-x-auto pt-1">
            <table class="w-full text-left text-xs border-collapse">
              <thead>
                <tr class="border-b border-slate-200/80 dark:border-slate-800/80 text-slate-500 dark:text-slate-400 font-semibold">
                  <th class="py-3 px-3"># ID</th>
                  <th class="py-3 px-3">Término</th>
                  <th class="py-3 px-3">Región</th>
                  <th class="py-3 px-3">Significado</th>
                  <th class="py-3 px-3">Ejemplo de uso</th>
                  <th class="py-3 px-3 text-right">Acción</th>
                </tr>
              </thead>
              <tbody class="divide-y divide-slate-200/60 dark:divide-slate-800/60">
                <tr *ngFor="let item of filteredModismos" class="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors">
                  <td class="py-3 px-3 font-mono text-slate-400 text-[11px]">
                    #{{ item.id_modismo }}
                  </td>
                  <td class="py-3 px-3 font-bold text-slate-900 dark:text-white font-mono">
                    {{ item.nombre_modismo }}
                  </td>
                  <td class="py-3 px-3">
                    <span class="inline-block px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
                      {{ item.region }}
                    </span>
                  </td>
                  <td class="py-3 px-3 text-slate-700 dark:text-slate-300 max-w-xs leading-relaxed">
                    {{ getSignificado(item) }}
                  </td>
                  <td class="py-3 px-3 text-slate-500 dark:text-slate-400 italic max-w-xs">
                    {{ getEjemplo(item) ? '"' + getEjemplo(item) + '"' : '—' }}
                  </td>
                  <td class="py-3 px-3 text-right">
                    <button
                      type="button"
                      (click)="confirmarEliminar(item)"
                      title="Eliminar del corpus"
                      class="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors">
                      <i class="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

      </main>

      <!-- 4. Modal Oscuro: Registrar Nuevo Modismo Individual -->
      <div
        *ngIf="mostrarModalNuevo"
        class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn"
        (click)="cerrarModalNuevo()">
        
        <div
          class="w-full max-w-lg rounded-2xl bg-white dark:bg-[#151E32] border border-slate-200 dark:border-slate-800 shadow-2xl p-6 space-y-4 animate-scaleIn"
          (click)="$event.stopPropagation()">
          
          <div class="flex items-center justify-between border-b border-slate-200/80 dark:border-slate-800/80 pb-3">
            <div class="flex items-center gap-2">
              <i class="bi bi-plus-circle-fill text-emerald-600 dark:text-emerald-400 text-lg"></i>
              <h3 class="text-base font-bold text-slate-900 dark:text-white">Registrar Nuevo Modismo</h3>
            </div>
            <button
              type="button"
              (click)="cerrarModalNuevo()"
              class="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-lg">
              <i class="bi bi-x-lg"></i>
            </button>
          </div>

          <form (ngSubmit)="guardarNuevoModismo()" class="space-y-3.5 text-xs">
            <div>
              <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Término / Expresión Dialectal: *
              </label>
              <input
                type="text"
                [(ngModel)]="nuevoModismo.nombre_modismo"
                name="nombre_modismo"
                required
                placeholder="Ej. chulla vida, pupo, ¡achachay!, caleta..."
                class="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            <div>
              <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Región Dialectal: *
              </label>
              <select
                [(ngModel)]="nuevoModismo.region"
                name="region"
                required
                class="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 px-3.5 py-2.5 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors cursor-pointer">
                <option value="Sierra / Carchi">Sierra / Carchi</option>
                <option value="Sierra / Pichincha">Sierra / Pichincha</option>
                <option value="Sierra">Sierra (General)</option>
                <option value="Costa / Guayas">Costa / Guayas</option>
                <option value="Costa / Manabí">Costa / Manabí</option>
                <option value="Costa">Costa (General)</option>
                <option value="Amazonía">Amazonía</option>
                <option value="Nacional">Nacional (Todo el Ecuador)</option>
              </select>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Significado / Definición Contextual: *
              </label>
              <textarea
                rows="2"
                [(ngModel)]="nuevoModismo.significado"
                name="significado"
                required
                placeholder="Explica qué significa la expresión y cómo se interpreta culturalmente..."
                class="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 p-3 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
              ></textarea>
            </div>

            <div>
              <label class="block font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ejemplo de Uso Cotidiano:
              </label>
              <textarea
                rows="2"
                [(ngModel)]="nuevoModismo.ejemplo"
                name="ejemplo"
                placeholder="Ej. 'Vamos de viaje con los amigos, total es chulla vida'..."
                class="w-full bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-slate-100 p-3 rounded-xl text-xs focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
              ></textarea>
            </div>

            <div *ngIf="modalError" class="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs">
              {{ modalError }}
            </div>

            <div class="flex items-center justify-end gap-2 pt-3 border-t border-slate-200/80 dark:border-slate-800/80">
              <button
                type="button"
                (click)="cerrarModalNuevo()"
                class="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                Cancelar
              </button>
              <button
                type="submit"
                [disabled]="isSaving"
                class="btn-primary py-2 px-5 text-xs font-bold shadow-sm flex items-center gap-2 disabled:opacity-50">
                <i *ngIf="isSaving" class="bi bi-arrow-repeat animate-spin"></i>
                <i *ngIf="!isSaving" class="bi bi-check-lg"></i>
                <span>{{ isSaving ? 'Guardando...' : 'Guardar Modismo' }}</span>
              </button>
            </div>
          </form>
        </div>
      </div>

    </div>
  `
})
export class GestionCorpusComponent implements OnInit {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

  modismosList: any[] = [];
  isLoading: boolean = false;
  searchQuery: string = '';
  selectedRegion: string = '';

  // Carga masiva
  selectedFile: File | null = null;
  isDragging: boolean = false;
  isUploading: boolean = false;
  uploadSuccess: string | null = null;
  uploadError: string | null = null;

  // Modal nuevo modismo
  mostrarModalNuevo: boolean = false;
  isSaving: boolean = false;
  modalError: string | null = null;
  nuevoModismo: NuevoModismoForm = {
    nombre_modismo: '',
    region: 'Sierra / Carchi',
    significado: '',
    ejemplo: ''
  };

  constructor(
    private http: HttpClient,
    private router: Router,
    public sidebarService: SidebarService,
    private authService: AuthService,
    private assistantService: AssistantService
  ) {}

  ngOnInit(): void {
    if (!this.authService.isAdmin()) {
      this.router.navigate(['/chat']);
      return;
    }
    this.cargarModismos();
  }

  cargarModismos(): void {
    this.isLoading = true;
    this.http.get<any[]>('/api/modismos/').subscribe({
      next: (data) => {
        this.modismosList = data || [];
        this.isLoading = false;
      },
      error: () => {
        this.isLoading = false;
      }
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
      const q = this.searchQuery.toLowerCase().trim();
      const matchQuery = !q ||
        (m.nombre_modismo && m.nombre_modismo.toLowerCase().includes(q)) ||
        (m.region && m.region.toLowerCase().includes(q)) ||
        this.getSignificado(m).toLowerCase().includes(q) ||
        this.getEjemplo(m).toLowerCase().includes(q);

      const matchRegion = !this.selectedRegion ||
        (m.region && m.region.toLowerCase().includes(this.selectedRegion.toLowerCase()));

      return matchQuery && matchRegion;
    });
  }

  // Métodos de Carga Masiva (Drag & Drop)
  onDragOver(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
  }

  onDrop(e: DragEvent): void {
    e.preventDefault();
    e.stopPropagation();
    this.isDragging = false;
    if (e.dataTransfer && e.dataTransfer.files.length > 0) {
      this.procesarArchivoSeleccionado(e.dataTransfer.files[0]);
    }
  }

  onFileSelected(event: any): void {
    const file = event.target.files?.[0];
    if (file) {
      this.procesarArchivoSeleccionado(file);
    }
  }

  procesarArchivoSeleccionado(file: File): void {
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext !== 'csv' && ext !== 'xlsx') {
      this.uploadError = 'Formato no compatible. Por favor sube un archivo .csv o .xlsx.';
      this.uploadSuccess = null;
      return;
    }
    this.selectedFile = file;
    this.uploadError = null;
    this.uploadSuccess = null;
  }

  cancelarArchivo(): void {
    this.selectedFile = null;
    this.uploadError = null;
    this.uploadSuccess = null;
    if (this.fileInputRef) {
      this.fileInputRef.nativeElement.value = '';
    }
  }

  subirArchivo(): void {
    if (!this.selectedFile) return;

    this.isUploading = true;
    this.uploadError = null;
    this.uploadSuccess = null;

    this.assistantService.subirArchivoCorpus(this.selectedFile).subscribe({
      next: (res) => {
        this.isUploading = false;
        this.uploadSuccess = res.mensaje || `Se procesaron exitosamente los modismos en PostgreSQL.`;
        this.selectedFile = null;
        if (this.fileInputRef) {
          this.fileInputRef.nativeElement.value = '';
        }
        this.cargarModismos();
      },
      error: (err) => {
        this.isUploading = false;
        this.uploadError = err.error?.detail || 'Error al procesar el archivo en el servidor Django.';
      }
    });
  }

  formatFileSize(bytes: number): string {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  }

  descargarPlantillaCSV(): void {
    const header = 'termino,region,significado,ejemplo\r\n';
    const rows = [
      'caleta,Costa / Guayas,Casa o lugar de residencia,Vamos a estudiar en mi caleta',
      'aniñado,Sierra / Pichincha,Persona de clase social alta o presumida,Ese local es frecuentado por aniñados',
      'churoso,Sierra / Carchi,Persona que tiene el cabello ondulado o con rizos,Mi hermano pequeño nació churoso',
      'fresco,Nacional,Persona tranquila o situación que no representa problema,Tranquilo veci todo está fresco'
    ].join('\r\n');

    const blob = new Blob([header + rows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'plantilla_modismos_plnec.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  // Métodos del Modal Nuevo Modismo
  abrirModalNuevo(): void {
    this.modalError = null;
    this.nuevoModismo = {
      nombre_modismo: '',
      region: 'Sierra / Carchi',
      significado: '',
      ejemplo: ''
    };
    this.mostrarModalNuevo = true;
  }

  cerrarModalNuevo(): void {
    this.mostrarModalNuevo = false;
    this.modalError = null;
  }

  guardarNuevoModismo(): void {
    this.modalError = null;
    if (!this.nuevoModismo.nombre_modismo.trim()) {
      this.modalError = 'El término o modismo es obligatorio.';
      return;
    }
    if (!this.nuevoModismo.significado.trim()) {
      this.modalError = 'El significado contextual es obligatorio.';
      return;
    }

    this.isSaving = true;
    this.assistantService.crearModismo(this.nuevoModismo).subscribe({
      next: () => {
        this.isSaving = false;
        this.cerrarModalNuevo();
        this.cargarModismos();
      },
      error: (err) => {
        this.isSaving = false;
        this.modalError = err.error?.detail || err.error?.nombre_modismo?.[0] || 'Error al registrar el modismo en la base de datos.';
      }
    });
  }

  confirmarEliminar(item: any): void {
    const confirmar = confirm(`¿Estás seguro de que deseas eliminar la expresión "${item.nombre_modismo}" del corpus dialectal?`);
    if (!confirmar) return;

    this.assistantService.eliminarModismo(item.id_modismo).subscribe({
      next: () => {
        this.cargarModismos();
      },
      error: (err) => {
        alert(err.error?.detail || 'No se pudo eliminar el modismo de la base de datos.');
      }
    });
  }
}

