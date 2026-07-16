package com.family.gps;

import android.Manifest;
import android.os.Build;

import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import com.google.firebase.FirebaseApp;
import com.google.firebase.messaging.FirebaseMessaging;

@CapacitorPlugin(
    name = "SafePush",
    permissions = @Permission(strings = { Manifest.permission.POST_NOTIFICATIONS }, alias = SafePushPlugin.PUSH_NOTIFICATIONS)
)
public class SafePushPlugin extends Plugin {
    static final String PUSH_NOTIFICATIONS = "receive";

    @PluginMethod
    public void checkPermissions(PluginCall call) {
        JSObject result = new JSObject();

        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU) {
            result.put(PUSH_NOTIFICATIONS, "granted");
            call.resolve(result);
            return;
        }

        result.put(PUSH_NOTIFICATIONS, getPermissionState(PUSH_NOTIFICATIONS).toString().toLowerCase());
        call.resolve(result);
    }

    @PluginMethod
    public void requestPermissions(PluginCall call) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.TIRAMISU || getPermissionState(PUSH_NOTIFICATIONS) == PermissionState.GRANTED) {
            JSObject result = new JSObject();
            result.put(PUSH_NOTIFICATIONS, "granted");
            call.resolve(result);
            return;
        }

        requestPermissionForAlias(PUSH_NOTIFICATIONS, call, "permissionsCallback");
    }

    @PluginMethod
    public void getToken(PluginCall call) {
        try {
            if (FirebaseApp.getApps(getContext()).isEmpty()) {
                FirebaseApp app = FirebaseApp.initializeApp(getContext());
                if (app == null) {
                    call.reject("Firebase is not configured. Check android/app/google-services.json and rebuild the APK.");
                    return;
                }
            }

            FirebaseMessaging.getInstance().setAutoInitEnabled(true);
            FirebaseMessaging.getInstance()
                .getToken()
                .addOnCompleteListener(task -> {
                    if (!task.isSuccessful()) {
                        Exception exception = task.getException();
                        call.reject(exception != null && exception.getMessage() != null ? exception.getMessage() : "FCM token failed");
                        return;
                    }

                    JSObject result = new JSObject();
                    result.put("value", task.getResult());
                    call.resolve(result);
                });
        } catch (Throwable throwable) {
            call.reject(throwable.getMessage() != null ? throwable.getMessage() : "Push setup failed");
        }
    }

    @PermissionCallback
    private void permissionsCallback(PluginCall call) {
        checkPermissions(call);
    }
}