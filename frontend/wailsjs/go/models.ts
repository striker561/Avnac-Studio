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

export namespace mcp {
	
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
	
	
	
	

}

