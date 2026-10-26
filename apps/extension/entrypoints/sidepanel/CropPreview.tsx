import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Crop, Maximize2, ScanText, X } from 'lucide-react';
import type { CropRect } from '@/lib/capture';
import { CROP_COMPLETO } from '@/lib/capture';
import { traducciones } from '@/lib/idioma';
import { useTextos } from './use-idioma';
import './CropPreview.css';

const TEXTOS = traducciones({
  es: {
    eyebrow: 'Esto es lo que vamos a leer',
    cancelar: 'Cancelar la captura',
    ayudaCompleta:
      'Arrastrá sobre la captura para quedarte solo con la publicación. Si hay varios posteos a la vista, recortar cambia el veredicto.',
    ayudaRecorte: 'Movelo, o estiralo de las esquinas. Tocá el fondo para empezar de nuevo.',
    alt: (origen: string) => `Captura de ${origen}`,
    esquina: (id: string) => `Ajustar la esquina ${id}`,
    leer: 'Leer esta imagen',
    completa: 'Usar la captura completa',
    privacidad: 'La imagen se usa solo para leerla y no se guarda en ningún lado.',
  },
  en: {
    eyebrow: 'This is what we are going to read',
    cancelar: 'Cancel the capture',
    ayudaCompleta:
      'Drag over the capture to keep only the post. If there are several posts in view, cropping changes the verdict.',
    ayudaRecorte: 'Move it, or stretch it from the corners. Tap the background to start over.',
    alt: (origen: string) => `Capture of ${origen}`,
    esquina: (id: string) => `Adjust the ${id} corner`,
    leer: 'Read this image',
    completa: 'Use the full capture',
    privacidad: 'The image is only used to read it and is not stored anywhere.',
  },
});

/**
 * "Esto es lo que vamos a leer": la captura, con un marco que el usuario
 * ajusta antes de mandarla.
 *
 * El recorte no es cosmético. En un feed hay seis posteos en pantalla al mismo
 * tiempo: sin recortar, el modelo lee un collage y el veredicto no vale nada
 * (ver sección 4.2 del brief). Y recortar ACÁ, en el panel, en vez de con un
 * overlay sobre la página, evita además que el propio overlay salga dentro de
 * la captura.
 *
 * De paso es la pantalla de consentimiento: el usuario ve exactamente lo que
 * se va a mandar, antes de que se mande. Es la regla de privacidad hecha UI.
 */

interface CropPreviewProps {
  /** La captura cruda (data URL JPEG) que armó background.ts. */
  dataUrl: string;
  /** Dominio de la página capturada, para el encabezado. */
  originLabel: string;
  onConfirm: (crop: CropRect) => void;
  onCancel: () => void;
}

/**
 * Lado mínimo del marco, en fracción de la imagen. El panel mide unos 380 px,
 * así que esto son ~38 px: menos que eso y las cuatro agarraderas (22 px cada
 * una) se pisan entre sí, además de que no alcanza para que el modelo lea nada.
 */
const MIN_LADO = 0.1;

type Esquina = 'nw' | 'ne' | 'sw' | 'se';

/** Qué se está arrastrando. `nuevo` es el marco que se dibuja desde cero. */
type Arrastre =
  | { modo: 'mover'; desdeX: number; desdeY: number; inicial: CropRect }
  | { modo: 'redimensionar'; esquina: Esquina; inicial: CropRect }
  | { modo: 'nuevo'; anclaX: number; anclaY: number };

function clamp01(valor: number): number {
  return Math.min(1, Math.max(0, valor));
}

function CropPreview({ dataUrl, originLabel, onConfirm, onCancel }: CropPreviewProps) {
  const t = useTextos(TEXTOS);
  const [crop, setCrop] = useState<CropRect>(CROP_COMPLETO);
  // Tamaño real de la captura en píxeles: se usa solo para mostrarle al
  // usuario cuánto está mandando. Llega con el onLoad de la imagen.
  const [natural, setNatural] = useState<{ width: number; height: number } | null>(null);
  const contenedorRef = useRef<HTMLDivElement>(null);
  const arrastreRef = useRef<Arrastre | null>(null);

  /** Posición del puntero en fracción del contenedor (0 a 1). */
  const aFraccion = useCallback((e: { clientX: number; clientY: number }) => {
    const rect = contenedorRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return { x: 0, y: 0 };
    return {
      x: clamp01((e.clientX - rect.left) / rect.width),
      y: clamp01((e.clientY - rect.top) / rect.height),
    };
  }, []);

  const alMover = useCallback(
    (e: PointerEvent) => {
      const arrastre = arrastreRef.current;
      if (!arrastre) return;
      const { x, y } = aFraccion(e);

      if (arrastre.modo === 'nuevo') {
        // Se dibuja desde el punto donde se apoyó el dedo hacia donde va, en
        // cualquier dirección: el ancla es fija y el otro vértice sigue al puntero.
        setCrop({
          x: Math.min(arrastre.anclaX, x),
          y: Math.min(arrastre.anclaY, y),
          width: Math.abs(x - arrastre.anclaX),
          height: Math.abs(y - arrastre.anclaY),
        });
        return;
      }

      if (arrastre.modo === 'mover') {
        const { inicial, desdeX, desdeY } = arrastre;
        // El marco no se deforma al moverlo: se frena contra los bordes.
        setCrop({
          ...inicial,
          x: Math.min(Math.max(0, inicial.x + (x - desdeX)), 1 - inicial.width),
          y: Math.min(Math.max(0, inicial.y + (y - desdeY)), 1 - inicial.height),
        });
        return;
      }

      // Redimensionar: la esquina opuesta a la que se agarró queda clavada.
      const { inicial, esquina } = arrastre;
      const izquierda = esquina === 'nw' || esquina === 'sw';
      const arriba = esquina === 'nw' || esquina === 'ne';
      const fijoX = izquierda ? inicial.x + inicial.width : inicial.x;
      const fijoY = arriba ? inicial.y + inicial.height : inicial.y;

      setCrop({
        x: Math.min(x, fijoX),
        y: Math.min(y, fijoY),
        width: Math.abs(x - fijoX),
        height: Math.abs(y - fijoY),
      });
    },
    [aFraccion],
  );

  /**
   * Cómo desengancharse de los listeners del arrastre en curso.
   *
   * Vive en un ref y no adentro de `alSoltar`: si `alSoltar` se quitara a sí
   * mismo tendría que nombrarse dentro de su propia definición. Funciona (para
   * cuando corre ya está inicializado), pero es una referencia circular que el
   * linter marca con razón, y basta un refactor para que deje de funcionar.
   */
  const soltarListenersRef = useRef<(() => void) | null>(null);

  const alSoltar = useCallback(() => {
    soltarListenersRef.current?.();
    soltarListenersRef.current = null;
    arrastreRef.current = null;
    // Un marco diminuto (un toque sin arrastrar, por ejemplo) se descarta en
    // vez de dejarlo: mandar 20 px de imagen no tiene sentido.
    setCrop((actual) =>
      actual.width < MIN_LADO || actual.height < MIN_LADO ? CROP_COMPLETO : actual,
    );
  }, []);

  /**
   * Los listeners van en `window` y no en el contenedor porque el puntero se
   * sale del marco (y de la imagen) a mitad del arrastre todo el tiempo: con
   * listeners locales, el gesto se corta justo cuando el usuario llega al borde.
   */
  const iniciarArrastre = (arrastre: Arrastre) => {
    arrastreRef.current = arrastre;
    window.addEventListener('pointermove', alMover);
    window.addEventListener('pointerup', alSoltar);
    soltarListenersRef.current = () => {
      window.removeEventListener('pointermove', alMover);
      window.removeEventListener('pointerup', alSoltar);
    };
  };

  // Si el panel se destruye a mitad de un arrastre (pasa solo: cambiar de
  // pestaña lo cierra), los listeners quedarían colgados de window.
  useEffect(() => () => soltarListenersRef.current?.(), []);

  const alApoyarEnImagen = (e: ReactPointerEvent<HTMLDivElement>) => {
    // Solo el fondo dibuja un marco nuevo; sobre el marco o las agarraderas
    // manda su propio handler (que corta la propagación).
    const { x, y } = aFraccion(e);
    setCrop({ x, y, width: 0, height: 0 });
    iniciarArrastre({ modo: 'nuevo', anclaX: x, anclaY: y });
  };

  const alApoyarEnMarco = (e: ReactPointerEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const { x, y } = aFraccion(e);
    iniciarArrastre({ modo: 'mover', desdeX: x, desdeY: y, inicial: crop });
  };

  const alApoyarEnEsquina = (e: ReactPointerEvent<HTMLButtonElement>, esquina: Esquina) => {
    e.stopPropagation();
    iniciarArrastre({ modo: 'redimensionar', esquina, inicial: crop });
  };

  const recorteCompleto = crop.width > 0.995 && crop.height > 0.995;
  const pxAncho = natural ? Math.round(crop.width * natural.width) : null;
  const pxAlto = natural ? Math.round(crop.height * natural.height) : null;

  return (
    <div className="crop">
      <div className="crop-head">
        <span className="crop-eyebrow">
          <Crop size={13} />
          {t.eyebrow}
        </span>
        <button className="crop-close" onClick={onCancel} aria-label={t.cancelar}>
          <X size={15} />
        </button>
      </div>

      <p className="crop-hint">{recorteCompleto ? t.ayudaCompleta : t.ayudaRecorte}</p>

      {/* touch-action: none va en el CSS — sin eso, arrastrar con el dedo
          scrollea el panel en vez de mover el marco. */}
      <div
        className="crop-canvas"
        ref={contenedorRef}
        onPointerDown={alApoyarEnImagen}
        role="presentation"
      >
        <img
          className="crop-img"
          src={dataUrl}
          alt={t.alt(originLabel)}
          draggable={false}
          onLoad={(e) =>
            setNatural({
              width: e.currentTarget.naturalWidth,
              height: e.currentTarget.naturalHeight,
            })
          }
        />

        <div
          className="crop-box"
          style={{
            left: `${crop.x * 100}%`,
            top: `${crop.y * 100}%`,
            width: `${crop.width * 100}%`,
            height: `${crop.height * 100}%`,
          }}
          onPointerDown={alApoyarEnMarco}
          role="presentation"
        >
          {(['nw', 'ne', 'sw', 'se'] as Esquina[]).map((esquina) => (
            <button
              key={esquina}
              type="button"
              className={`crop-handle crop-handle-${esquina}`}
              onPointerDown={(e) => alApoyarEnEsquina(e, esquina)}
              aria-label={t.esquina(esquina)}
              tabIndex={-1}
            />
          ))}
        </div>
      </div>

      <div className="crop-meta">
        <span className="crop-origin">{originLabel}</span>
        {pxAncho !== null && pxAlto !== null && (
          <span className="crop-size">
            {pxAncho} × {pxAlto} px
          </span>
        )}
      </div>

      <div className="crop-actions">
        <button className="analyze-btn" onClick={() => onConfirm(crop)}>
          <ScanText size={16} />
          {t.leer}
        </button>
        {!recorteCompleto && (
          <button className="crop-secondary" onClick={() => setCrop(CROP_COMPLETO)}>
            <Maximize2 size={14} />
            {t.completa}
          </button>
        )}
      </div>

      <p className="crop-privacy">{t.privacidad}</p>
    </div>
  );
}

export default CropPreview;
