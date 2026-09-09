package com.family.gps;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.Context;
import android.os.Build;
import android.os.Bundle;

import com.getcapacitor.BridgeActivity;
import com.google.firebase.FirebaseApp;

import android.media.AudioAttributes;
import android.media.RingtoneManager;

public class MainActivity extends BridgeActivity {
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        registerPlugin(SafePushPlugin.class);
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
        channel.setSound(
        RingtoneManager.getDefaultUri(RingtoneManager.TYPE_NOTIFICATION),
        new AudioAttributes.Builder()
        .setUsage(AudioAttributes.USAGE_NOTIFICATION)
        .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
        .build()
);

        NotificationManager manager = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager != null) {
            manager.createNotificationChannel(channel);
        }
    }
}
