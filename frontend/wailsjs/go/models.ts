export namespace avnacconfig {
	
	export class AppConfig {
	    unsplash_access_key?: string;
	    snap_intensity: number;
	    developer_mode: boolean;
	    rotation_sensitivity: number;
	    mcp_enabled: boolean;
	    mcp_port: number;
	
	    static createFrom(source: any = {}) {
	        return new AppConfig(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.unsplash_access_key = source["unsplash_access_key"];
	        this.snap_intensity = source["snap_intensity"];
	        this.developer_mode = source["developer_mode"];
	        this.rotation_sensitivity = source["rotation_sensitivity"];
	        this.mcp_enabled = source["mcp_enabled"];
	        this.mcp_port = source["mcp_port"];
	    }
	}

}

export namespace avnacserver {
	
	export class UnsplashUserLinks {
	    html: string;
	
	    static createFrom(source: any = {}) {
	        return new UnsplashUserLinks(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.html = source["html"];
	    }
	}
	export class UnsplashUser {
	    name: string;
	    links: UnsplashUserLinks;
	
	    static createFrom(source: any = {}) {
	        return new UnsplashUser(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.links = this.convertValues(source["links"], UnsplashUserLinks);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UnsplashLinks {
	    download_location: string;
	    html: string;
	
	    static createFrom(source: any = {}) {
	        return new UnsplashLinks(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.download_location = source["download_location"];
	        this.html = source["html"];
	    }
	}
	export class UnsplashUrls {
	    small: string;
	    regular: string;
	    full: string;
	
	    static createFrom(source: any = {}) {
	        return new UnsplashUrls(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.small = source["small"];
	        this.regular = source["regular"];
	        this.full = source["full"];
	    }
	}
	export class UnsplashPhoto {
	    id: string;
	    width: number;
	    height: number;
	    description?: string;
	    alt_description?: string;
	    urls: UnsplashUrls;
	    links: UnsplashLinks;
	    user: UnsplashUser;
	
	    static createFrom(source: any = {}) {
	        return new UnsplashPhoto(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.id = source["id"];
	        this.width = source["width"];
	        this.height = source["height"];
	        this.description = source["description"];
	        this.alt_description = source["alt_description"];
	        this.urls = this.convertValues(source["urls"], UnsplashUrls);
	        this.links = this.convertValues(source["links"], UnsplashLinks);
	        this.user = this.convertValues(source["user"], UnsplashUser);
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class UnsplashFeedResult {
	    photos: UnsplashPhoto[];
	    hasMore: boolean;
	
	    static createFrom(source: any = {}) {
	        return new UnsplashFeedResult(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.photos = this.convertValues(source["photos"], UnsplashPhoto);
	        this.hasMore = source["hasMore"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	
	
	export class UnsplashRateLimit {
	    limit: number;
	    remaining: number;
	
	    static createFrom(source: any = {}) {
	        return new UnsplashRateLimit(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.limit = source["limit"];
	        this.remaining = source["remaining"];
	    }
	}
	
	

}

export namespace mcp {
	
	export class ClientCheckReport {
	    answered: boolean;
	    clientId?: string;
	    actionHandlerId?: string;
	    revision: number;
	    document?: string;
	    actions: string[];
	    missing: string[];
	    expected: string[];
	    latencyMs: number;
	    stale: boolean;
	    message: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new ClientCheckReport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.answered = source["answered"];
	        this.clientId = source["clientId"];
	        this.actionHandlerId = source["actionHandlerId"];
	        this.revision = source["revision"];
	        this.document = source["document"];
	        this.actions = source["actions"];
	        this.missing = source["missing"];
	        this.expected = source["expected"];
	        this.latencyMs = source["latencyMs"];
	        this.stale = source["stale"];
	        this.message = source["message"];
	        this.error = source["error"];
	    }
	}
	export class HTTPOptions {
	    Port: number;
	    Token: string;
	
	    static createFrom(source: any = {}) {
	        return new HTTPOptions(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.Port = source["Port"];
	        this.Token = source["Token"];
	    }
	}
	export class MCPState {
	    enabled: boolean;
	    running: boolean;
	    port: number;
	    url: string;
	    sse_url: string;
	    error?: string;
	
	    static createFrom(source: any = {}) {
	        return new MCPState(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.enabled = source["enabled"];
	        this.running = source["running"];
	        this.port = source["port"];
	        this.url = source["url"];
	        this.sse_url = source["sse_url"];
	        this.error = source["error"];
	    }
	}
	export class ToolSurfaceOp {
	    op: string;
	    action?: string;
	    client: boolean;
	
	    static createFrom(source: any = {}) {
	        return new ToolSurfaceOp(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.op = source["op"];
	        this.action = source["action"];
	        this.client = source["client"];
	    }
	}
	export class ToolSurfaceTool {
	    name: string;
	    description: string;
	    ops?: ToolSurfaceOp[];
	    action?: string;
	
	    static createFrom(source: any = {}) {
	        return new ToolSurfaceTool(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.name = source["name"];
	        this.description = source["description"];
	        this.ops = this.convertValues(source["ops"], ToolSurfaceOp);
	        this.action = source["action"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}
	export class ToolSurfaceReport {
	    tools: ToolSurfaceTool[];
	    toolCount: number;
	    opCount: number;
	    generatedAt: string;
	    fingerprint: string;
	    clientActions: string[];
	
	    static createFrom(source: any = {}) {
	        return new ToolSurfaceReport(source);
	    }
	
	    constructor(source: any = {}) {
	        if ('string' === typeof source) source = JSON.parse(source);
	        this.tools = this.convertValues(source["tools"], ToolSurfaceTool);
	        this.toolCount = source["toolCount"];
	        this.opCount = source["opCount"];
	        this.generatedAt = source["generatedAt"];
	        this.fingerprint = source["fingerprint"];
	        this.clientActions = source["clientActions"];
	    }
	
		convertValues(a: any, classs: any, asMap: boolean = false): any {
		    if (!a) {
		        return a;
		    }
		    if (a.slice && a.map) {
		        return (a as any[]).map(elem => this.convertValues(elem, classs));
		    } else if ("object" === typeof a) {
		        if (asMap) {
		            for (const key of Object.keys(a)) {
		                a[key] = new classs(a[key]);
		            }
		            return a;
		        }
		        return new classs(a);
		    }
		    return a;
		}
	}

}

