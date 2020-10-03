import m from "mithril";
import firebase from "firebase/app";
import "firebase/firebase-auth";
import { refreshAvailableProviders } from "./Persistence";

enum AuthState {
	PENDING,
	LOGGED_IN,
	ANONYMOUS,
}

interface User {
	uid: string;
	displayName: string;
	email: string;
}

let authState: AuthState = AuthState.PENDING;
let currentUser: null | User = null;

function init() {
	firebase.auth().onAuthStateChanged(onAuthStateChanged);
}

function getAuthState() {
	return authState;
}

function getCurrentUser() {
	return currentUser;
}

function onAuthStateChanged(user) {
	if (user) {
		// A user is signed in.
		authState = AuthState.LOGGED_IN
		currentUser = {
			uid: user.uid,
			displayName: user.displayName,
			email: user.email,
		};
		// const emailVerified = user.emailVerified;
		// const photoURL = user.photoURL;
		// const isAnonymous = user.isAnonymous;
		// const providerData = user.providerData;

	} else {
		// No user is signed in, or a user has signed out.
		authState = AuthState.ANONYMOUS;
		currentUser = null;

	}

	m.redraw();
	refreshAvailableProviders().then(m.redraw);
}

function signup(email: string, password: string) {
	const prevState = authState;
	authState = AuthState.PENDING;
	return firebase.auth()
		.createUserWithEmailAndPassword(email, password)
		.catch(error => {
			authState = prevState;
			return Promise.reject(error);
		});
}

function login(email: string, password: string) {
	const prevState = authState;
	authState = AuthState.PENDING
	return firebase.auth()
		.signInWithEmailAndPassword(email, password)
		.catch(error => {
			authState = prevState;
			return Promise.reject(error);
		});
}

function logout() {
	const prevState = authState;
	authState = AuthState.PENDING;
	return firebase.auth()
		.signOut()
		.catch(error => {
			authState = prevState;
			return Promise.reject(error);
		});
}

export default {
	init,
	AuthState,
	getAuthState,
	getCurrentUser,
	signup,
	login,
	logout,
};
