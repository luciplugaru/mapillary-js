import {Observable} from "rxjs/Observable";
import {Subscription} from "rxjs/Subscription";

import "rxjs/add/observable/merge";

import "rxjs/add/operator/filter";
import "rxjs/add/operator/map";
import "rxjs/add/operator/withLatestFrom";

import {
    BounceHandler,
    ComponentService,
    Component,
    DoubleClickZoomHandler,
    DragPanHandler,
    FlyHandler,
    IMouseConfiguration,
    MouseTouchPair,
    ScrollZoomHandler,
    TouchZoomHandler,
} from "../../Component";
import {
    ViewportCoords,
    Spatial,
} from "../../Geo";
import {RenderCamera} from "../../Render";
import {
    IFrame,
    IRotation,
    State,
} from "../../State";
import {
    Container,
    Navigator,
} from "../../Viewer";

/**
 * @class MouseComponent
 *
 * @classdesc Component handling mouse and touch events for camera movement.
 */
export class MouseComponent extends Component<IMouseConfiguration> {
    /** @inheritdoc */
    public static componentName: string = "mouse";

    private _viewportCoords: ViewportCoords;
    private _spatial: Spatial;

    private _bounceHandler: BounceHandler;
    private _doubleClickZoomHandler: DoubleClickZoomHandler;
    private _dragPanHandler: DragPanHandler;
    private _flyHandler: FlyHandler;
    private _scrollZoomHandler: ScrollZoomHandler;
    private _touchZoomHandler: TouchZoomHandler;

    private _configurationSubscription: Subscription;
    private _orbitMovementSubscription: Subscription;

    constructor(name: string, container: Container, navigator: Navigator) {
        super(name, container, navigator);

        let spatial: Spatial = new Spatial();
        let viewportCoords: ViewportCoords = new ViewportCoords();

        this._spatial = spatial;
        this._viewportCoords = viewportCoords;

        this._bounceHandler = new BounceHandler(this, container, navigator, viewportCoords, spatial);
        this._doubleClickZoomHandler = new DoubleClickZoomHandler(this, container, navigator, viewportCoords);
        this._dragPanHandler = new DragPanHandler(this, container, navigator, viewportCoords, spatial);
        this._flyHandler = new FlyHandler(this, container, navigator, viewportCoords);
        this._scrollZoomHandler = new ScrollZoomHandler(this, container, navigator, viewportCoords);
        this._touchZoomHandler = new TouchZoomHandler(this, container, navigator, viewportCoords);
    }

    /**
     * Get double click zoom.
     *
     * @returns {DoubleClickZoomHandler} The double click zoom handler.
     */
    public get doubleClickZoom(): DoubleClickZoomHandler {
        return this._doubleClickZoomHandler;
    }

    /**
     * Get drag pan.
     *
     * @returns {DragPanHandler} The drag pan handler.
     */
    public get dragPan(): DragPanHandler {
        return this._dragPanHandler;
    }

    /**
     * Get scroll zoom.
     *
     * @returns {ScrollZoomHandler} The scroll zoom handler.
     */
    public get scrollZoom(): ScrollZoomHandler {
        return this._scrollZoomHandler;
    }

    /**
     * Get touch zoom.
     *
     * @returns {TouchZoomHandler} The touch zoom handler.
     */
    public get touchZoom(): TouchZoomHandler {
        return this._touchZoomHandler;
    }

    protected _activate(): void {
        this._bounceHandler.enable();
        this._flyHandler.enable();

        this._configurationSubscription = this._configuration$
            .subscribe(
                (configuration: IMouseConfiguration): void => {
                    if (configuration.doubleClickZoom) {
                        this._doubleClickZoomHandler.enable();
                    } else {
                        this._doubleClickZoomHandler.disable();
                    }

                    if (configuration.dragPan) {
                        this._dragPanHandler.enable();
                    } else {
                        this._dragPanHandler.disable();
                    }

                    if (configuration.scrollZoom) {
                        this._scrollZoomHandler.enable();
                    } else {
                        this._scrollZoomHandler.disable();
                    }

                    if (configuration.touchZoom) {
                        this._touchZoomHandler.enable();
                    } else {
                        this._touchZoomHandler.disable();
                    }
                });

        this._container.mouseService.claimMouse(this._name, 0);
    }

    protected _deactivate(): void {
        this._container.mouseService.unclaimMouse(this._name);

        this._configurationSubscription.unsubscribe();

        this._bounceHandler.disable();
        this._doubleClickZoomHandler.disable();
        this._dragPanHandler.disable();
        this._flyHandler.disable();
        this._scrollZoomHandler.disable();
        this._touchZoomHandler.disable();
    }

    protected _getDefaultConfiguration(): IMouseConfiguration {
        return { doubleClickZoom: true, dragPan: true, scrollZoom: true, touchZoom: true };
    }

    private _processOrbitMovement(events: MouseTouchPair, r: RenderCamera): IRotation {
        let element: HTMLElement = this._container.element;

        let previousEvent: MouseEvent | Touch = events[0];
        let event: MouseEvent | Touch = events[1];

        let movementX: number = event.clientX - previousEvent.clientX;
        let movementY: number = event.clientY - previousEvent.clientY;

        let [canvasX, canvasY]: number[] = this._viewportCoords.canvasPosition(event, element);

        let direction: THREE.Vector3 =
            this._viewportCoords.unprojectFromCanvas(canvasX, canvasY, element, r.perspective)
            .sub(r.perspective.position);

        let directionX: THREE.Vector3 =
            this._viewportCoords.unprojectFromCanvas(canvasX - movementX, canvasY, element, r.perspective)
            .sub(r.perspective.position);

        let directionY: THREE.Vector3 =
            this._viewportCoords.unprojectFromCanvas(canvasX, canvasY - movementY, element, r.perspective)
            .sub(r.perspective.position);

        let phi: number = (movementX > 0 ? 1 : -1) * directionX.angleTo(direction);
        let theta: number = (movementY > 0 ? -1 : 1) * directionY.angleTo(direction);

        return { phi: phi, theta: theta };
    }
}

ComponentService.register(MouseComponent);
export default MouseComponent;