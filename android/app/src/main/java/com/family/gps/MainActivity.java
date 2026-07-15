package com.family.gps;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        initializeFirebaseSafely();
        createWakeNotificationChannel();
        super.onCreate(savedInstanceState);
    }

    private void initializeFirebaseSafely() {
        try {
            FirebaseApp.initializeApp(this);
        } catch (Throwable ignored) {
            // Push setup must never crash the native shell.
        }
    }

    private void createWakeNotificationChannel() {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;

        NotificationChannel channel = new NotificationChannel(
            "wake",
            "Ξύπνα βλάκα",
            NotificationManager.IMPORTANCE_HIGH
        );
        channel.setDescription("Ειδοποιήσεις όταν κάποιος από την οικογένεια σε ψάχνει.");
        channel.enableVibration(true);

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
