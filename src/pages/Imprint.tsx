import React from 'react';
import { Link } from '../components/Link';

export const Imprint: React.FC = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-900 to-gray-900 text-white p-4">
      <div className="max-w-2xl mx-auto py-8">
        {/* Header */}
        <h1 className="text-3xl font-bold mb-6 text-center">Imprint</h1>

        {/* Contact Information */}
        <div className="prose prose-invert">
          <p>
            <strong>Felix Koch Einzelunternehmen</strong>
            <br />
            Kreuzwiesenstraße 1<br />
            82065 Baierbrunn, Germany
          </p>
          <p>
            <strong>Phone:</strong> +49 15755870113
            <br />
            <strong>Email:</strong>{' '}
            <a
              href="mailto:felix.koch@mail.de"
              className="text-blue-400 underline"
            >
              felix.koch@mail.de
            </a>
          </p>
          <p>
            <strong>German Tax Number:</strong> 183 400 51692
          </p>
        </div>

        {/* EU Dispute Resolution */}
        <div className="prose prose-invert mt-6">
          <h2 className="text-2xl font-semibold">
            EU Online Dispute Resolution
          </h2>
          <p>
            The European Commission provides a platform for online dispute
            resolution. You can access it here:{' '}
            <a
              href="http://www.ec.europa.eu/consumers/odr"
              className="text-blue-400 underline"
              target="_blank"
              rel="noopener noreferrer"
            >
              www.ec.europa.eu/consumers/odr
            </a>
          </p>
        </div>

        {/* Back to Game Link */}
        <div className="mt-8 text-center">
          <Link
            href="/"
            className="text-blue-400 underline hover:text-blue-300"
          >
            Back to Scorekeeper
          </Link>
        </div>
      </div>
    </div>
  );
};
