import {Injectable} from '@angular/core';
import {Observable, Observer} from 'rxjs/Rx';
import {Utils, RequestHelper, StorageHelper} from '../helpers';
import {IRepository, IBranch, IToken, IContents, IProfileMetadata, IUserProfile, ICommit} from './';

declare var Microsoft: any;

@Injectable()
export class GithubService {
    private static CLIENT_ID = "61ef07373b60f4f075cd";
    private static REDIRECT_URI = window.location.protocol + "//" + window.location.host;
    private static SCOPE = "repo";
    private _baseUrl: string = "";
    private _profile: IUserProfile;
    private _profileStorage: StorageHelper<IUserProfile>;

    constructor(private _request: RequestHelper) {
        this._profileStorage = new StorageHelper<IUserProfile>('Profile');
    }

    user(): Observable<IProfileMetadata> {
        return this._request.get<IProfileMetadata>("https://api.github.com/user") as Observable<IProfileMetadata>;
    }

    orgs(username: string): Observable<IProfileMetadata> {
        return this._request.get<IProfileMetadata>("https://api.github.com/users/" + username + "/orgs") as Observable<IProfileMetadata>;
    }

    repos(page: number, orgName: string, personal: boolean): Observable<IRepository[]> {
        var url = personal ? "https://api.github.com/user/repos?page=" + page + "&affiliation=owner,collaborator&sort=updated&direction=desc" : "https://api.github.com/orgs/" + orgName + "/repos?page=" + page;
        return this._request.get<IRepository[]>(url) as Observable<IRepository[]>;
    }

    files(orgName: string, repoName: string, branchName: string, path?: string): Observable<IContents[]> {
        var url = "https://api.github.com/repos/" + orgName + "/" + repoName + "/contents";
        if (!Utils.isNull(path)) { url += "/" + path; }
        return this._request.get<IContents[]>(url + "?ref=" + branchName) as Observable<IContents[]>;
    }

    branches(orgName: string, repoName: string): Observable<IBranch[]> {
        return this._request.get<IBranch[]>("https://api.github.com/repos/" + orgName + "/" + repoName + "/branches") as Observable<IBranch[]>;
    }

    file(orgName: string, repoName: string, branchName: string, filePath: string): Observable<string> {
        return this._request.getWithMediaHeaders<string>("https://api.github.com/repos/" + orgName + "/" + repoName + "/contents/" + filePath + "?ref=" + branchName) as Observable<string>;
    }

    commits(orgName: string, repoName: string, branchName: string, filePath: string): Observable<ICommit[]> {
        return this._request.get<ICommit[]>("https://api.github.com/repos/" + orgName + "/" + repoName + "/commits?path=" + filePath + "&sha=" + branchName + "&until=" + (new Date().toISOString())) as Observable<ICommit[]>;
    }

    getSha(orgName: string, repoName: string, branchName: string, path?: string): Observable<IContents> {
        var url = "https://api.github.com/repos/" + orgName + "/" + repoName + "/contents";
        if (!Utils.isNull(path)) { url += "/" + path; }
        return this._request.get<IContents>(url + "?ref=" + branchName) as Observable<IContents>;
    }

    createFile(orgName: string, repoName: string, filePath: string, body: any): Observable<string> {
        return this._request.put<string>("https://api.github.com/repos/" + orgName + "/" + repoName + "/contents/" + filePath, body) as Observable<string>;
    }

    updateFile(orgName: string, repoName: string, filePath: string, body: any): Observable<string> {
        return this._request.put<string>("https://api.github.com/repos/" + orgName + "/" + repoName + "/contents/" + filePath, body) as Observable<string>;
    }

    uploadImage(orgName: string, repoName: string, fileName: string, body: any): Observable<string> {
        return this._request.put<string>("https://api.github.com/repos/" + orgName + "/" + repoName + "/contents/" + fileName, body) as Observable<string>;
    }

    getFileData(type: string): Observable<string> {
        var url;
        switch (type) {
            case 'Code sample readme':
                url = 'assets/templates/readme-code-sample.md';
                break;
            case 'API spec':
                url = 'assets/templates/object-definition.md';
                break;
            case 'Conceptual article':
                url = 'assets/templates/conceptual-article.md';
                break;
            default:
                url = 'assets/templates/simple-file.md';
        }
        return this._request.raw(url) as Observable<string>;
    }

    login(): Promise<IUserProfile> {
        if (Utils.isWeb) Promise.reject('Cannot be executed outside of word');
        return new Promise(this._showAuthDialog.bind(this));
    }

    logout() {
        StorageHelper.clear();
    }

    get profile(): IUserProfile {
        if (Utils.isEmpty(this._profile)) {
            this._profile = this._profileStorage.first();

            if (!Utils.isEmpty(this._profile)) {
                this._request.token(this._profile.token);
            }
        }

        return this._profile;
    }

    set profile(value: IUserProfile) {
        if (!Utils.isEmpty(value)) {
            this._profile = value;
            this._profileStorage.add(value.user.login, value);
        }
    }

    private _showAuthDialog(resolve, reject) {
        var context = Office.context as any;
        context.ui.displayDialogAsync(this._getUrl(), { height: 50, width: 35 },
            result => {
                var dialog = result.value;
                dialog.addEventHandler(Microsoft.Office.WebExtension.EventType.DialogMessageReceived, args => {
                    dialog.close();

                    try {
                        if (Utils.isEmpty(args.message)) {
                            reject("No token received");
                        }

                        if (args.message.indexOf('access_token') == -1) {
                            reject(JSON.parse(args.message));
                        }

                        let token = this._request.token(JSON.parse(args.message));
                        if (Utils.isNull(token)) {
                            reject("Unable to parse token");
                        }

                        this.user().toPromise().then(userMetadata => {
                            this.orgs(userMetadata.login).toPromise()
                                .then(orgs => {
                                    this.profile = <IUserProfile>{
                                        user: userMetadata,
                                        orgs: orgs,
                                        token: token
                                    };

                                    resolve(this.profile);
                                }, error => reject);
                        }, error => reject);
                    }
                    catch (exception) {
                        reject(exception);
                    }
                });
            });
    }

    private _getUrl() {
        var baseUrl = "https://github.com/login/oauth/authorize?client_id=@client_id&redirect_uri=@redirect_uri&scope=@scope";
        return Utils.replace(baseUrl)
            ('@client_id', GithubService.CLIENT_ID)
            ('@redirect_uri', GithubService.REDIRECT_URI)
            ('@scope', GithubService.SCOPE)
            ();
    }
}